import Lead from './lead.model';
import { CreateLeadInput, UpdateLeadInput } from './lead.validation';
import { ILeadDocument } from './lead.types';
import { AppError } from '../../../utils/apiError';

export const createLead = async (data: CreateLeadInput): Promise<ILeadDocument> => {
    const lead = await Lead.create(data);
    return lead.populate({ path: 'assignedTo', select: 'firstName lastName email' });
};

export const getLeads = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, status, source } = query;
    const filter: Record<string, unknown> = {};
    if (search) filter.$text = { $search: search as string };
    if (status) filter.status = status;
    if (source) filter.source = source;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Lead.find(filter).populate('assignedTo', 'firstName lastName email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Lead.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getLeadById = async (id: string): Promise<ILeadDocument> => {
    const lead = await Lead.findById(id).populate('assignedTo', 'firstName lastName email');
    if (!lead) throw new AppError('Lead not found', 404);
    return lead;
};

export const updateLead = async (id: string, data: UpdateLeadInput): Promise<ILeadDocument> => {
    const lead = await Lead.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('assignedTo', 'firstName lastName email');
    if (!lead) throw new AppError('Lead not found', 404);
    return lead;
};

export const deleteLead = async (id: string): Promise<void> => {
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) throw new AppError('Lead not found', 404);
};
