import SalesFollowUp from '../models/sales-followup.model';
import { ISalesFollowUpDocument } from '../types/sales-followup.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: Partial<ISalesFollowUpDocument>): Promise<ISalesFollowUpDocument> =>
    SalesFollowUp.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, status, salesPerson } = query;
    const filter: Record<string, unknown> = {};
    if (status)      filter.status      = status;
    if (salesPerson) filter.salesPerson = salesPerson;
    
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        SalesFollowUp.find(filter)
            .populate({
                path: 'salesData',
                populate: { path: 'customer', select: 'customerId name phone address region sector' }
            })
            .populate('customer', 'customerId name phone address region sector email')
            .populate('salesPerson', 'firstName lastName email')
            .sort({ scheduledDate: 1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        SalesFollowUp.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<ISalesFollowUpDocument> => {
    const doc = await SalesFollowUp.findById(id)
        .populate({
            path: 'salesData',
            populate: { path: 'customer', select: 'customerId name phone address region sector' }
        })
        .populate('customer', 'customerId name phone address region sector email')
        .populate('salesPerson', 'firstName lastName email');
    if (!doc) throw new AppError('Sales follow-up record not found', 404);
    return doc;
};

export const update = async (id: string, data: Partial<ISalesFollowUpDocument>): Promise<ISalesFollowUpDocument> => {
    const doc = await SalesFollowUp.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Sales follow-up record not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await SalesFollowUp.findByIdAndDelete(id);
    if (!doc) throw new AppError('Sales follow-up record not found', 404);
};

export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await SalesFollowUp.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};
