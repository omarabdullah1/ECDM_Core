import mongoose from 'mongoose';
import Invoice from '../models/invoice.model';
import { CreateInvoiceInput, UpdateInvoiceInput } from '../validation/invoice.validation';
import { IInvoiceDocument, InvoiceStatus } from '../types/invoice.types';
import { AppError } from '../../../utils/apiError';
import { InventoryFinance } from '../models/inventory-finance.model';
import StockMovement from '../../operations/models/stock-movement.model';
import { MovementType } from '../../operations/types/inventory-plus.types';
import SalesOrder from '../../sales/models/sales-order.model';
import CustomerOrder from '../../customer/models/customer-order.model';
import WorkOrder from '../../operations/models/work-order.model';
import * as priceListService from '../../operations/services/price-list.service';

const generateInvoiceNumber = async (): Promise<string> => {
    const count = await Invoice.countDocuments();
    return `INV-F-${String(count + 1).padStart(5, '0')}`;
};

export const createInvoice = async (data: CreateInvoiceInput): Promise<IInvoiceDocument> => {
    const invoiceNumber = await generateInvoiceNumber();
    const invoice = new Invoice({ ...data, invoiceNumber });
    return await invoice.save();
};

export const getInvoices = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, status, customerId } = query;
    const filter: Record<string, unknown> = {};
    if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Invoice.find(filter)
            .populate('customerId', 'name phone email customerId')
            .populate('salesOrderId', 'salesOrderId') 
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Invoice.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getInvoiceById = async (id: string): Promise<IInvoiceDocument> => {
    const invoice = await Invoice.findById(id).populate('customerId', 'name phone email customerId company address region');
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
};

/**
 * Helper to sync Invoice status/amount changes back to the CustomerOrder (Order Finance)
 * Ensures that and recorded payments reflect in the Order's paidAmount.
 */
const syncInvoiceStatusWithOrder = async (invoice: IInvoiceDocument) => {
    if (!invoice.salesOrderId) return;

    const customerOrder = await CustomerOrder.findOne({ salesOrderId: invoice.salesOrderId });
    if (!customerOrder) return;

    // Sync the actual paid amount from the invoice
    customerOrder.paidAmount = invoice.paidAmount || 0;
    
    // Status sync is less critical for the amount, but we could update deal status if needed
    // However, CustomerOrder doesn't have a direct 'status' that matches Invoice 1:1 except 'deal'
    
    await customerOrder.save();
};

export const updateInvoice = async (id: string, data: UpdateInvoiceInput): Promise<IInvoiceDocument> => {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const oldStatus = invoice.status;
    const oldPaidAmount = invoice.paidAmount;

    Object.assign(invoice, data);
    
    // If status or paidAmount changed, trigger synchronization
    if ((data.status && data.status !== oldStatus) || 
        (data.paidAmount !== undefined && data.paidAmount !== oldPaidAmount)) {
        await syncInvoiceStatusWithOrder(invoice);
    }

    return await invoice.save();
};

/**
 * Core Logic for Deducting Stock - Separated to be reusable
 */
const deductStockForInvoice = async (invoice: IInvoiceDocument, userId: string) => {
    if (invoice.isStockDeducted) return;
    if (!invoice.items || invoice.items.length === 0) return;

    console.log(`📦 Stock: Deducting items for invoice ${invoice.invoiceNumber}`);
    
    for (const item of invoice.items) {
        if (item.inventoryItemId) {
            const inventoryItem = await InventoryFinance.findById(item.inventoryItemId);
            if (!inventoryItem) continue;

            if (inventoryItem.stockNumber < item.quantity) {
                throw new AppError(`Insufficient stock for ${item.description}`, 400);
            }

            await InventoryFinance.findByIdAndUpdate(item.inventoryItemId, {
                $inc: { stockNumber: -item.quantity }
            });

            await StockMovement.create([{
                product: item.inventoryItemId,
                type: MovementType.Out,
                quantity: item.quantity,
                reason: `Invoice Payment Initiated: ${invoice.invoiceNumber}`,
                reference: invoice.invoiceNumber,
                performedBy: new mongoose.Types.ObjectId(userId),
            }]);
        }
        
        if (item.priceListId) {
            try {
                await priceListService.adjustStock(String(item.priceListId), -item.quantity);
            } catch (stockError) {
                console.error(`⚠️ Failed to deduct PriceList stock for ${item.description}:`, (stockError as Error).message);
                throw new AppError(`Insufficient PriceList stock for ${item.description}`, 400);
            }
        }
    }

    invoice.isStockDeducted = true;
};

/**
 * Specifically handles status updates (formerly approveInvoice)
 * Maintains compatibility with existing controller endpoints.
 */
export const updateInvoiceStatus = async (id: string, status: InvoiceStatus, userId: string): Promise<IInvoiceDocument> => {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    if (invoice.status === status) {
        throw new AppError(`Invoice is already in ${status} status`, 400);
    }

    // 1. Update status and metadata
    invoice.status = status;
    if (status === InvoiceStatus.Paid) {
        invoice.approvedBy = new mongoose.Types.ObjectId(userId);
        invoice.approvalDate = new Date();
        // If they manually set to Paid, assume full payment if not already recorded
        if (invoice.paidAmount < invoice.grandTotal) {
            invoice.paidAmount = invoice.grandTotal;
        }
    }

    // 2. Stock Deduction Logic (Trigger on Paid or PartiallyPaid if not already done)
    if ((status === InvoiceStatus.Paid || status === InvoiceStatus.PartiallyPaid) && !invoice.isStockDeducted) {
        await deductStockForInvoice(invoice, userId);
    }

    // 3. Synchronize with Order Finance
    await syncInvoiceStatusWithOrder(invoice);

    return await invoice.save();
};

/**
 * Records a new payment against an invoice
 */
export const addPaymentToInvoice = async (
    id: string, 
    paymentData: { amount: number, method: string, date?: Date, notes?: string },
    userId: string
): Promise<IInvoiceDocument> => {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const remaining = invoice.grandTotal - invoice.paidAmount;
    if (paymentData.amount <= 0) throw new AppError('Payment amount must be greater than zero', 400);
    if (paymentData.amount > remaining + 0.01) { // Allowing small float margin
        throw new AppError(`Payment amount (${paymentData.amount}) exceeds remaining balance (${remaining})`, 400);
    }

    // 1. Record the payment
    invoice.payments.push({
        amount: paymentData.amount,
        date: paymentData.date || new Date(),
        method: paymentData.method,
        notes: paymentData.notes,
        recordedBy: new mongoose.Types.ObjectId(userId)
    });

    // 2. Update paidAmount calculation
    invoice.paidAmount = (invoice.paidAmount || 0) + paymentData.amount;

    // 3. Update Status
    if (invoice.paidAmount >= invoice.grandTotal - 0.01) {
        invoice.status = InvoiceStatus.Paid;
        invoice.approvalDate = new Date();
        invoice.approvedBy = new mongoose.Types.ObjectId(userId);
    } else {
        invoice.status = InvoiceStatus.PartiallyPaid;
    }

    // 4. Trigger Stock Deduction on first payment
    if (!invoice.isStockDeducted) {
        await deductStockForInvoice(invoice, userId);
    }

    // 5. Synchronize with Order Finance
    await syncInvoiceStatusWithOrder(invoice);

    return await invoice.save();
};

export const deleteInvoice = async (id: string): Promise<void> => {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);
    
    if (invoice.status === InvoiceStatus.Paid) {
        throw new AppError('Cannot delete a paid invoice', 400);
    }

    await Invoice.findByIdAndDelete(id);
};

/**
 * Generates an Invoice from a SalesOrder (Order Finance workflow)
 */
export const generateFromOrder = async (incomingId: string): Promise<IInvoiceDocument> => {
    let salesOrderDbId = incomingId;
    
    let order = await SalesOrder.findById(incomingId);
    if (!order) {
        const customerOrder = await CustomerOrder.findById(incomingId);
        if (customerOrder && customerOrder.salesOrderId) {
            salesOrderDbId = String(customerOrder.salesOrderId);
            order = await SalesOrder.findById(salesOrderDbId);
        }
    }

    if (!order) {
        throw new AppError('The associated Sales Order could not be located.', 422);
    }

    if (order.invoiceId) {
        throw new AppError('An invoice has already been generated', 400);
    }

    const quotation = order.quotation;
    const items = quotation?.items?.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        priceListId: item.priceListId
    })) || [];

    if (items.length === 0) {
        items.push({
            description: (order as any).typeOfOrder || (order as any).issueDescription || "Order Service",
            quantity: 1,
            unitPrice: quotation?.grandTotal || 0,
            priceListId: undefined
        });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const invoiceData = {
        invoiceNumber,
        customerId: order.customer,
        salesOrderId: order._id,
        items,
        subTotal: quotation?.subTotal || 0,
        tax: 0,
        grandTotal: quotation?.grandTotal || 0,
        status: InvoiceStatus.Pending, // Default to Pending as requested
        notes: `Generated from Sales Order: ${order.salesOrderId}.`
    };

    const invoice = new Invoice(invoiceData);
    const savedInvoice = await invoice.save();

    order.invoiceId = savedInvoice.invoiceNumber;
    await order.save();

    return savedInvoice;
};

/**
 * Generates a standalone spare-parts invoice for a Work Order.
 * The invoice contains ONLY the spare parts used in the Work Order —
 * it does NOT include Sales Order quotation items.
 *
 * Supports:
 * 1. Creating a brand new invoice specifically for spare parts.
 * 2. Updating an already-linked or explicitly chosen invoice.
 */
export const syncWorkOrderPartsWithInvoice = async (workOrderId: string, targetInvoiceId?: string) => {
    console.log(`🧾 Finance: Generating spare-parts invoice for WorkOrder ${workOrderId} (Target: ${targetInvoiceId || 'NEW'})`);

    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
        console.error('   ❌ WorkOrder not found');
        return;
    }

    const customerOrder = await CustomerOrder.findById(workOrder.customerOrderId);
    if (!customerOrder) {
        console.error('   ❌ CustomerOrder not found');
        return;
    }

    // We still load the SalesOrder only for reference info in the notes field
    const salesOrder = await SalesOrder.findById(customerOrder.salesOrderId);

    let invoice: any = null;

    if (targetInvoiceId) {
        // Mode 1: Update an explicitly chosen existing invoice
        invoice = await Invoice.findById(targetInvoiceId);
        if (!invoice) throw new AppError('The selected invoice to update was not found', 404);
        if (invoice.status === InvoiceStatus.Paid) throw new AppError('Cannot update an already Paid invoice', 400);
    } else if (workOrder.invoiceId) {
        // Mode 2: Re-generate / update the invoice already linked to this WorkOrder
        invoice = await Invoice.findOne({ invoiceNumber: workOrder.invoiceId });
    }

    if (!invoice) {
        // Mode 3: Create a fresh, standalone spare-parts invoice
        const invoiceNumber = await generateInvoiceNumber();
        invoice = new Invoice({
            invoiceNumber,
            customerId: customerOrder.customerId,
            // No salesOrderId — this invoice is independent of the original Sales Order.
            status: InvoiceStatus.Pending,
            items: [],
            notes: `Spare Parts Invoice — Work Order: ${(workOrder as any).sparePartsId || workOrderId}${salesOrder ? ` (Ref Sales Order: ${(salesOrder as any).salesOrderId})` : ''}`
        });
    }

    // Populate priceListId to get item names for invoice descriptions
    const populatedWorkOrder = await WorkOrder.findById(workOrderId).populate('partsUsed.priceListId');

    // ── Build items from Work Order spare parts ONLY ──────────────────────────
    // Sales Order quotation items are intentionally excluded.
    const workOrderParts = (populatedWorkOrder?.partsUsed || []).map((p: any) => ({
        description: p.priceListId?.itemName || 'Spare Part',
        quantity: p.quantity,
        unitPrice: p.unitCost,
        priceListId: p.priceListId?._id || p.priceListId
    }));

    if (workOrderParts.length === 0) {
        throw new AppError('No spare parts found on this Work Order to generate an invoice for.', 400);
    }

    invoice.items = workOrderParts as any;

    // invoice.pre('save') will recalculate subTotal and grandTotal automatically
    await invoice.save();

    // Stamp the WorkOrder with the new invoice reference for UI display
    const updatedWorkOrder = await WorkOrder.findByIdAndUpdate(workOrderId, {
        invoiceId: invoice.invoiceNumber,
        invoiceStatus: invoice.status
    }, { new: true })
    .populate({
        path: 'customerOrderId',
        populate: [
            { path: 'customerId', select: 'name phone customerId' },
            { path: 'salesOrderId', select: 'salesOrderId invoiceId' }
        ]
    });

    console.log(`   ✅ Invoice ${invoice.invoiceNumber} saved with ${workOrderParts.length} spare part(s). No Sales Order items included.`);

    return {
        invoiceNumber: invoice.invoiceNumber,
        updatedWorkOrder
    };
};
