import Feedback from '../models/feedback.model';
import { CreateFeedbackInput, UpdateFeedbackInput } from '../validation/feedback.validation';
import { IFeedbackDocument } from '../types/feedback.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateFeedbackInput): Promise<IFeedbackDocument> =>
    Feedback.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customerId, customerOrderId } = query;
    const filter: Record<string, unknown> = {};
    if (customerId)      filter.customerId      = customerId;
    if (customerOrderId) filter.customerOrderId = customerOrderId;
    
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Feedback.find(filter)
            .populate('customerId',      'customerId name phone region address')
            .populate('customerOrderId') // Crucial for Engineer name and dates
            .populate('updatedBy',       'email firstName lastName')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Feedback.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<IFeedbackDocument> => {
    const doc = await Feedback.findById(id)
        .populate('customerId',      'customerId name phone region address')
        .populate('customerOrderId') // Crucial for Engineer name and dates
        .populate('updatedBy',       'email firstName lastName');
    if (!doc) throw new AppError('Feedback not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateFeedbackInput): Promise<IFeedbackDocument> => {
    const doc = await Feedback.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Feedback not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await Feedback.findByIdAndDelete(id);
    if (!doc) throw new AppError('Feedback not found', 404);
};

/**
 * Bulk delete multiple feedback records by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await Feedback.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};
