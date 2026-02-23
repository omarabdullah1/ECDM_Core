import MarketingLead from '../models/marketing-lead.model';
import { CreateMarketingLeadInput, UpdateMarketingLeadInput } from '../validation/marketing-leads.validation';
import { IMarketingLeadDocument } from '../types/marketing-leads.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateMarketingLeadInput & Record<string, unknown>): Promise<IMarketingLeadDocument> => {
    // Allow frontend to send fullName instead of contactName
    if (!data.contactName && data.fullName) data.contactName = data.fullName as string;
    return MarketingLead.create(data);
};

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, source, status, campaign, assignedTo } = query;
    const filter: Record<string, unknown> = {};
    if (search)     filter.$text     = { $search: search as string };
    if (source)     filter.source    = source;
    if (status)     filter.status    = status;
    if (campaign)   filter.campaign  = campaign;
    if (assignedTo) filter.assignedTo = assignedTo;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        MarketingLead.find(filter)
            .populate('campaign',   'name platform status')
            .populate('assignedTo', 'firstName lastName')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        MarketingLead.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<IMarketingLeadDocument> => {
    const doc = await MarketingLead.findById(id)
        .populate('campaign',   'name platform status')
        .populate('assignedTo', 'firstName lastName email');
    if (!doc) throw new AppError('Marketing lead not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateMarketingLeadInput): Promise<IMarketingLeadDocument> => {
    const doc = await MarketingLead.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Marketing lead not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await MarketingLead.findByIdAndDelete(id);
    if (!doc) throw new AppError('Marketing lead not found', 404);
};
