import MarketingData from '../models/marketing-data.model';
import { CreateMarketingDataInput, UpdateMarketingDataInput } from '../validation/marketing-data.validation';
import { IMarketingDataDocument } from '../types/marketing-data.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateMarketingDataInput): Promise<IMarketingDataDocument> =>
    MarketingData.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, status, uploadBatch } = query;
    const filter: Record<string, unknown> = {};
    if (search)      filter.$text       = { $search: search as string };
    if (status)      filter.status      = status;
    if (uploadBatch) filter.uploadBatch = uploadBatch;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        MarketingData.find(filter)
            .populate('customer', 'name phone')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        MarketingData.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<IMarketingDataDocument> => {
    const doc = await MarketingData.findById(id).populate('customer', 'name phone sector');
    if (!doc) throw new AppError('Marketing data record not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateMarketingDataInput): Promise<IMarketingDataDocument> => {
    const doc = await MarketingData.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Marketing data record not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await MarketingData.findByIdAndDelete(id);
    if (!doc) throw new AppError('Marketing data record not found', 404);
};
