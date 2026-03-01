import FollowUp from '../models/follow-up.model';
import { CreateFollowUpInput, UpdateFollowUpInput } from '../validation/follow-up.validation';
import { IFollowUpDocument } from '../types/follow-up.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateFollowUpInput): Promise<IFollowUpDocument> =>
    FollowUp.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, csr, solvedIssue, source } = query;
    const filter: Record<string, unknown> = {};
    if (customer)                filter.customer    = customer;
    if (csr)                     filter.csr         = csr;
    if (solvedIssue !== undefined) filter.solvedIssue = solvedIssue === 'true';
    
    // Filter by source type
    if (source === 'WorkOrder')  filter.workOrder   = { $ne: null };
    if (source === 'SalesLead')  filter.leadId      = { $ne: null };
    if (source === 'SalesData')  filter.salesDataId = { $ne: null };
    if (source === 'Manual')     filter.$and = [{ workOrder: null }, { leadId: null }, { salesDataId: null }];
    
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        FollowUp.find(filter)
            .populate('customer',    'name phone region address')
            .populate('csr',         'firstName lastName email')
            .populate('workOrder',   'typeOfOrder issue')
            .populate({ path: 'leadId',      populate: { path: 'customerId', select: 'name phone address region' } })
            .populate({ path: 'salesDataId', populate: { path: 'customer',   select: 'name phone address region' } })
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        FollowUp.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<IFollowUpDocument> => {
    const doc = await FollowUp.findById(id)
        .populate('customer',    'name phone region address')
        .populate('csr',         'firstName lastName email')
        .populate('workOrder')
        .populate({ path: 'leadId',      populate: { path: 'customerId', select: 'name phone address region' } })
        .populate({ path: 'salesDataId', populate: { path: 'customer',   select: 'name phone address region' } });
    if (!doc) throw new AppError('Follow-up not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateFollowUpInput): Promise<IFollowUpDocument> => {
    const doc = await FollowUp.findByIdAndUpdate(id, data, { new: true, runValidators: true });
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
