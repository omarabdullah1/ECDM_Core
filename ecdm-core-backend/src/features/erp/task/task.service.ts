import { AppError } from '../../../utils/apiError';
import Task from './task.model';
import { ITaskDocument } from './task.types';
import { CreateTaskInput, UpdateTaskInput } from './task.validation';

// ── Create ──────────────────────────────────────────────────────────
export const createTask = async (
    data: CreateTaskInput,
    createdBy: string,
): Promise<ITaskDocument> => {
    const task = await Task.create({ ...data, createdBy });
    return task.populate([
        { path: 'assignedTo', select: 'firstName lastName email' },
        { path: 'relatedClient', select: 'companyName' },
        { path: 'createdBy', select: 'firstName lastName email' },
    ]);
};

// ── Get all (paginated + search/filter) ─────────────────────────────
export const getAllTasks = async (
    query: Record<string, unknown>,
    skip: number,
    limit: number,
): Promise<{ tasks: ITaskDocument[]; total: number }> => {
    const filter: Record<string, unknown> = {};

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.assignedTo) filter.assignedTo = query.assignedTo;
    if (query.relatedClient) filter.relatedClient = query.relatedClient;
    if (query.createdBy) filter.createdBy = query.createdBy;

    if (query.search) {
        filter.$or = [
            { title: { $regex: query.search, $options: 'i' } },
            { description: { $regex: query.search, $options: 'i' } },
        ];
    }

    // Due-date range filter
    if (query.dueBefore || query.dueAfter) {
        filter.dueDate = {};
        if (query.dueBefore) (filter.dueDate as Record<string, unknown>).$lte = new Date(query.dueBefore as string);
        if (query.dueAfter) (filter.dueDate as Record<string, unknown>).$gte = new Date(query.dueAfter as string);
    }

    const [tasks, total] = await Promise.all([
        Task.find(filter)
            .populate('assignedTo', 'firstName lastName email')
            .populate('relatedClient', 'companyName')
            .populate('createdBy', 'firstName lastName email')
            .skip(skip)
            .limit(limit)
            .sort({ dueDate: 1, priority: -1, createdAt: -1 }),
        Task.countDocuments(filter),
    ]);

    return { tasks, total };
};

// ── Get by ID ───────────────────────────────────────────────────────
export const getTaskById = async (id: string): Promise<ITaskDocument> => {
    const task = await Task.findById(id)
        .populate('assignedTo', 'firstName lastName email')
        .populate('relatedClient', 'companyName email')
        .populate('createdBy', 'firstName lastName email');

    if (!task) {
        throw new AppError('Task not found', 404);
    }
    return task;
};

// ── Update ──────────────────────────────────────────────────────────
export const updateTask = async (
    id: string,
    data: UpdateTaskInput,
): Promise<ITaskDocument> => {
    // Use save() to trigger pre-save hooks (auto completedAt)
    const task = await Task.findById(id);
    if (!task) {
        throw new AppError('Task not found', 404);
    }

    Object.assign(task, data);
    await task.save();

    return task.populate([
        { path: 'assignedTo', select: 'firstName lastName email' },
        { path: 'relatedClient', select: 'companyName' },
        { path: 'createdBy', select: 'firstName lastName email' },
    ]);
};

// ── Delete ──────────────────────────────────────────────────────────
export const deleteTask = async (id: string): Promise<void> => {
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
        throw new AppError('Task not found', 404);
    }
};

/**
 * Bulk delete multiple tasks by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await Task.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

