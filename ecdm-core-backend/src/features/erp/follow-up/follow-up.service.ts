import FollowUp from './follow-up.model';
import { AppError } from '../../../utils/apiError';
import { CreateFollowUpInput, UpdateFollowUpInput } from './follow-up.validation';

export const create = async (data: CreateFollowUpInput) => FollowUp.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, csr, solvedIssue } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (customer)                filter.customer    = customer;
    if (csr)                     filter.csr         = csr;
    if (solvedIssue !== undefined) filter.solvedIssue = solvedIssue === 'true';

    const [data, total] = await Promise.all([
        FollowUp.find(filter)
            .populate('customer', 'name phone region')
            .populate('csr', 'firstName lastName email')
            .populate('workOrder', 'typeOfOrder issue')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        FollowUp.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };
};

export const getById = async (id: string) => {
    const item = await FollowUp.findById(id)
        .populate('customer', 'name phone region')
        .populate('csr', 'firstName lastName email')
        .populate('workOrder');
    if (!item) throw new AppError('Follow-up not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateFollowUpInput) => {
    const item = await FollowUp.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Follow-up not found', 404);
    return item;
};

export const deleteFollowUp = async (id: string) => {
    const item = await FollowUp.findByIdAndDelete(id);
    if (!item) throw new AppError('Follow-up not found', 404);
};
