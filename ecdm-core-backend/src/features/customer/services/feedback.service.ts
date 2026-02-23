import Feedback from '../models/feedback.model';
import { CreateFeedbackInput, UpdateFeedbackInput } from '../validation/feedback.validation';
import { IFeedbackDocument } from '../types/feedback.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateFeedbackInput): Promise<IFeedbackDocument> =>
    Feedback.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, engineer, workOrder } = query;
    const filter: Record<string, unknown> = {};
    if (customer)  filter.customer  = customer;
    if (engineer)  filter.engineer  = engineer;
    if (workOrder) filter.workOrder = workOrder;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Feedback.find(filter)
            .populate('customer',  'name phone')
            .populate('engineer',  'firstName lastName email')
            .populate('workOrder', 'typeOfOrder issue')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Feedback.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<IFeedbackDocument> => {
    const doc = await Feedback.findById(id)
        .populate('customer',  'name phone')
        .populate('engineer',  'firstName lastName email')
        .populate('workOrder');
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
