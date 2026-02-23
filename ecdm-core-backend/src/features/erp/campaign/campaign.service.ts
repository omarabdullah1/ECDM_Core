import Campaign from './campaign.model';
import { AppError } from '../../../utils/apiError';
import { CreateCampaignInput, UpdateCampaignInput } from './campaign.validation';

export const create = async (data: CreateCampaignInput) => Campaign.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, platform, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (platform) filter.platform = platform;
    if (status)   filter.status   = status;

    const [data, total] = await Promise.all([
        Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Campaign.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };
};

export const getById = async (id: string) => {
    const item = await Campaign.findById(id);
    if (!item) throw new AppError('Campaign not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateCampaignInput) => {
    const item = await Campaign.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Campaign not found', 404);
    return item;
};

export const deleteCampaign = async (id: string) => {
    const item = await Campaign.findByIdAndDelete(id);
    if (!item) throw new AppError('Campaign not found', 404);
};
