import Activity from './activity.model';
import { CreateActivityInput, UpdateActivityInput } from './activity.validation';
import { IActivityDocument } from './activity.types';
import { AppError } from '../../../utils/apiError';

const populateFields = [
    { path: 'performedBy', select: 'firstName lastName email' },
    { path: 'relatedClient', select: 'companyName' },
    { path: 'relatedLead', select: 'title contactName' },
];

export const createActivity = async (data: CreateActivityInput, performedBy: string): Promise<IActivityDocument> => {
    const activity = await Activity.create({ ...data, performedBy });
    return activity.populate(populateFields);
};

export const getActivities = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, type } = query;
    const filter: Record<string, unknown> = {};
    if (search) filter.$text = { $search: search as string };
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Activity.find(filter).populate(populateFields).sort({ date: -1 }).skip(skip).limit(Number(limit)),
        Activity.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getActivityById = async (id: string): Promise<IActivityDocument> => {
    const activity = await Activity.findById(id).populate(populateFields);
    if (!activity) throw new AppError('Activity not found', 404);
    return activity;
};

export const updateActivity = async (id: string, data: UpdateActivityInput): Promise<IActivityDocument> => {
    const activity = await Activity.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(populateFields);
    if (!activity) throw new AppError('Activity not found', 404);
    return activity;
};

export const deleteActivity = async (id: string): Promise<void> => {
    const activity = await Activity.findByIdAndDelete(id);
    if (!activity) throw new AppError('Activity not found', 404);
};
