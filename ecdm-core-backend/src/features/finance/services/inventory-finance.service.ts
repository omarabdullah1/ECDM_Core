import WorkOrder from '../../operations/models/work-order.model';
import Invoice from '../models/invoice.model';
import { AppError } from '../../../utils/apiError';
import * as invoiceService from './invoice.service';

/**
 * Repurposed Inventory Finance Service
 * Now manages financial aspects of spare parts via Work Orders.
 */

export const create = async (data: any) => {
  return WorkOrder.create(data); // Maintenance purposes
};

export const getAll = async (query: Record<string, unknown>) => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);
  
  // Filter for Work Orders that have spare parts
  const filter = { "partsUsed.0": { "$exists": true } };

  const [data, total] = await Promise.all([
    WorkOrder.find(filter)
      .populate({
        path: 'customerOrderId',
        populate: [
          { path: 'customerId', select: 'name phone customerId' },
          { path: 'salesOrderId', select: 'salesOrderId invoiceId' }
        ]
      })
      .populate('engineerId', 'fullName firstName lastName role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    WorkOrder.countDocuments(filter),
  ]);

  // Synchronize invoice status for each work order (optional but improves real-time accuracy)
  // In a high-traffic system, this should be event-driven instead of on GET.
  
  // Fetch invoices for these work orders to get their database IDs for linking and paid amounts
  const invoiceNumbers = data.map(wo => wo.invoiceId).filter(Boolean);
  const invoices = await Invoice.find({ invoiceNumber: { $in: invoiceNumbers } }).select('_id invoiceNumber paidAmount');
  const invoiceMap = Object.fromEntries(invoices.map(inv => [inv.invoiceNumber, { id: inv._id, paid: inv.paidAmount }]));

  // Map the data to match the frontend table headers
  const transformedData = data.map((wo: any) => {
    const customerName = wo.customerOrderId?.customerId?.name || 'Unknown Customer';
    const engineerName = wo.engineerId?.fullName || 
                        (wo.engineerId?.firstName ? `${wo.engineerId.firstName} ${wo.engineerId.lastName || ''}`.trim() : wo.maintenanceEngineer);

    // Dynamically calculate price to ensure accuracy even if cost object isn't synced
    const totalPrice = wo.partsUsed?.reduce((sum: number, p: any) => sum + (p.quantity * (p.unitCost || 0)), 0) || 0;
    
    // Retrieve paid amount from linked invoice if it exists
    const linkedInvoiceInfo = wo.invoiceId ? invoiceMap[wo.invoiceId] : null;
    const paidAmount = linkedInvoiceInfo?.paid || 0;

    return {
      ...wo.toObject(),
      _id: wo._id,
      sparePartsId: wo.invoiceId || `WO-${wo._id.toString().slice(-4).toUpperCase()}`,
      itemName: `Spare Parts: ${customerName}`,
      price: totalPrice,
      paidAmount: paidAmount, // Added for frontend balance display
      stockNumber: wo.partsUsed?.length || 0,
      status: wo.invoiceStatus === 'Paid' ? 'In stock' : 'Repurchase needed',
      customerName,
      engineerName,
      engineerId: wo.engineerId?._id || null,
      commissionPercentage: wo.commissionPercentage || 0,
      invoiceDbId: linkedInvoiceInfo?.id || null,
    };
  });
  
  return { 
    data: transformedData, 
    pagination: { 
      page: Number(page), 
      limit: Number(limit), 
      total, 
      pages: Math.ceil(total / Number(limit)) 
    } 
  };
};

/**
 * Generates or updates an invoice for a specific Work Order
 */
export const generateInvoiceForWorkOrder = async (workOrderId: string, targetInvoiceId?: string) => {
    return await invoiceService.syncWorkOrderPartsWithInvoice(workOrderId, targetInvoiceId);
};

export const getById = async (id: string) => {
  const item = await WorkOrder.findById(id).populate({
    path: 'customerOrderId',
    populate: [{ path: 'customerId' }]
  });
  if (!item) throw new AppError('Work order record not found', 404);
  return item;
};

export const update = async (id: string, data: any) => {
  const item = await WorkOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!item) throw new AppError('Work order record not found', 404);
  return item;
};

export const remove = async (id: string) => {
  const item = await WorkOrder.findByIdAndDelete(id);
  if (!item) throw new AppError('Work order record not found', 404);
};

