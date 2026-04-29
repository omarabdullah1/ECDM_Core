import FollowUp from '../models/follow-up.model';
import CustomerOrder from '../models/customer-order.model';
import { populateOrderContext } from '../utils/follow-up-context';
import { CreateFollowUpInput, UpdateFollowUpInput } from '../validation/follow-up.validation';
import { IFollowUpDocument } from '../types/follow-up.types';
import { AppError } from '../../../utils/apiError';


export const create = async (data: CreateFollowUpInput): Promise<IFollowUpDocument> => {
    const orderContext = await populateOrderContext(
        data.customerOrderId, 
        data.customer, 
        data.salesDataId, 
        data.leadId
    );
    const payload = {
        ...data,
        orderContext,
    };
    return FollowUp.create(payload);
};

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, csr, solvedIssue, source } = query;
    const filter: Record<string, any> = {};
    if (customer)                filter.customer    = customer;
    if (csr)                     filter.csr         = csr;
    if (solvedIssue !== undefined) filter.solvedIssue = solvedIssue === 'true';
    
    // Filter by source type
    if (source === 'WorkOrder')  filter.workOrder   = { $ne: null };
    if (source === 'SalesLead')  filter.leadId      = { $ne: null };
    if (source === 'SalesData')  filter.salesDataId = { $ne: null };
    if (source === 'Manual')     filter.$and = [{ workOrder: null }, { leadId: null }, { salesDataId: null }];
    

    // ---- Enforce CustomerOrder Deal === 'Approved' restriction ----
    // Fetches only approved order IDs once, then gates customerOrderId-linked follow-ups.
    // All other source types (SalesData, WorkOrder, Lead, Manual) pass through freely.
    const approvedOrders = await CustomerOrder.find({ deal: 'Approved' }).select('_id');
    const approvedOrderIds = approvedOrders.map((order: any) => order._id);

    const dealCondition = {
        $or: [
            { customerOrderId: null },              // Manual / SalesData / WorkOrder / Lead records
            { customerOrderId: { $exists: false } }, // Records with no customerOrderId field
            { customerOrderId: { $in: approvedOrderIds } }, // Only Approved Customer Orders
        ]
    };

    if (filter.$and) {
        filter.$and.push(dealCondition);
    } else {
        filter.$and = [dealCondition];
    }
    // -----------------------------------------------------------------

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        FollowUp.find(filter)
            .populate('customer',       'customerId name phone region address')
            .populate('csr',            'firstName lastName email')
            .populate('customerOrderId') // New: Populate Customer Order for QC data
            .populate('workOrder',      'typeOfOrder issue')
            .populate({ path: 'leadId',      populate: { path: 'customerId', select: 'name phone address region' } })
            .populate({ path: 'salesDataId', populate: { path: 'customer',   select: 'name phone address region' } })
            .populate('updatedBy',      'email firstName lastName') // New: Track who modified
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        FollowUp.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<IFollowUpDocument> => {
    const doc = await FollowUp.findById(id)
        .populate('customer',       'customerId name phone region address')
        .populate('csr',            'firstName lastName email')
        .populate('customerOrderId') // New: Populate Customer Order for QC data
        .populate('workOrder')
        .populate({ path: 'leadId',      populate: { path: 'customerId', select: 'name phone address region' } })
        .populate({ path: 'salesDataId', populate: { path: 'customer',   select: 'name phone address region' } })
        .populate('updatedBy',      'email firstName lastName'); // New: Track who modified
    if (!doc) throw new AppError('Follow-up not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateFollowUpInput): Promise<IFollowUpDocument> => {
    const existing = await FollowUp.findById(id);
    if (!existing) throw new AppError('Follow-up not found', 404);
    
    const customerOrderId = data.customerOrderId || existing.customerOrderId?.toString();
    const customerId = data.customer || existing.customer?.toString();
    const salesDataId = data.salesDataId || existing.salesDataId?.toString();
    const leadId = data.leadId || existing.leadId?.toString();

    const orderContext = await populateOrderContext(customerOrderId, customerId, salesDataId, leadId);
    
    const updateData = {
        ...data,
        orderContext: orderContext || existing.orderContext,
    };
    
    const doc = await FollowUp.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!doc) throw new AppError('Follow-up not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await FollowUp.findByIdAndDelete(id);
    if (!doc) throw new AppError('Follow-up not found', 404);
};

/**
 * Bulk delete multiple follow-up records by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await FollowUp.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

