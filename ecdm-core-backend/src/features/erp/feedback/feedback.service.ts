import Feedback from './feedback.model';
import { AppError } from '../../../utils/apiError';
import { CreateFeedbackInput, UpdateFeedbackInput } from './feedback.validation';

export const create = async (data: CreateFeedbackInput) => Feedback.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, engineer, workOrder } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (customer)  filter.customer  = customer;
    if (engineer)  filter.engineer  = engineer;
    if (workOrder) filter.workOrder = workOrder;

    const [data, total] = await Promise.all([
        Feedback.find(filter)
            .populate('customer', 'name phone')
            .populate('engineer', 'firstName lastName email')
            .populate('workOrder', 'typeOfOrder issue')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Feedback.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };
};

export const getById = async (id: string) => {
    const item = await Feedback.findById(id)
        .populate('customer', 'name phone')
        .populate('engineer', 'firstName lastName email')
        .populate('workOrder');
    if (!item) throw new AppError('Feedback not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateFeedbackInput) => {
    const item = await Feedback.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Feedback not found', 404);
    return item;
};

export const deleteFeedback = async (id: string) => {
    const item = await Feedback.findByIdAndDelete(id);
    if (!item) throw new AppError('Feedback not found', 404);
};
