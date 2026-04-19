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
    const { page = 1, limit = 10, search, status } = query;
    const filter: Record<string, unknown> = {};
    if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Invoice.find(filter)
            .populate('customerId', 'name phone email customerId')
            .populate('salesOrderId', 'invoiceNumber') // just in case
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
 * Helper to sync Invoice status changes back to the CustomerOrder (Order Finance)
 * Ensures that Paid invoices reflect in the Order's paidAmount.
 */
const syncInvoiceStatusWithOrder = async (invoice: IInvoiceDocument) => {
    if (!invoice.salesOrderId) return;

    const customerOrder = await CustomerOrder.findOne({ salesOrderId: invoice.salesOrderId });
    if (!customerOrder) return;

    if (invoice.status === InvoiceStatus.Paid) {
        // Set paidAmount to the invoice total
        customerOrder.paidAmount = invoice.grandTotal;
    } else if (invoice.status === InvoiceStatus.Canceled || invoice.status === InvoiceStatus.Unpaid) {
        // Reset paidAmount if canceled or unpaid
        customerOrder.paidAmount = 0;
    }
    // Note: Pending status doesn't modify the amount yet

    await customerOrder.save();
};

export const updateInvoice = async (id: string, data: UpdateInvoiceInput): Promise<IInvoiceDocument> => {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const oldStatus = invoice.status;
    Object.assign(invoice, data);
    
    // If status changed, trigger synchronization
    if (data.status && data.status !== oldStatus) {
        await syncInvoiceStatusWithOrder(invoice);
    }

    return await invoice.save();
};

/**
 * Specifically handles status updates (formerly approveInvoice)
 * Maintains compatibility with existing controller endpoints but uses the new status logic.
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
    }

    // 2. Synchronize with Order Finance
    await syncInvoiceStatusWithOrder(invoice);

    // 3. Stock Deduction Logic
    if (status === InvoiceStatus.Paid && invoice.items && invoice.items.length > 0) {
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
                    reason: `Invoice Paid: ${invoice.invoiceNumber}`,
                    reference: invoice.invoiceNumber,
                    performedBy: new mongoose.Types.ObjectId(userId),
                }]);
            }
        }
    }

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
        unitPrice: item.unitPrice
    })) || [];

    if (items.length === 0) {
        items.push({
            description: order.typeOfOrder || order.issueDescription || "Order Service",
            quantity: 1,
            unitPrice: quotation?.grandTotal || 0
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
