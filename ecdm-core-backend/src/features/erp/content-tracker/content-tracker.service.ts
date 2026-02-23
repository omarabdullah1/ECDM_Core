import ContentTracker from './content-tracker.model';
import { AppError } from '../../../utils/apiError';
import { CreateContentTrackerInput, UpdateContentTrackerInput } from './content-tracker.validation';

export const create = async (data: CreateContentTrackerInput) => ContentTracker.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, type, status, sector } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (type)   filter.type   = type;
    if (status) filter.status = status;
    if (sector) filter.sector = sector;

    const [data, total] = await Promise.all([
        ContentTracker.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        ContentTracker.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };
};

export const getById = async (id: string) => {
    const item = await ContentTracker.findById(id);
    if (!item) throw new AppError('Content tracker item not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateContentTrackerInput) => {
    const item = await ContentTracker.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Content tracker item not found', 404);
    return item;
};

export const deleteContentTracker = async (id: string) => {
    const item = await ContentTracker.findByIdAndDelete(id);
    if (!item) throw new AppError('Content tracker item not found', 404);
};
