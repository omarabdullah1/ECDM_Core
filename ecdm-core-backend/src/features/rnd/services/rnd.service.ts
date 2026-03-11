import RndProject from '../models/rnd-project.model';
import RndTask from '../models/rnd-task.model';
import { CreateProjectInput, UpdateProjectInput, CreateTaskInput, UpdateTaskInput } from '../validation/rnd.validation';
import { IRndProjectDocument } from '../types/rnd-project.types';
import { IRndTaskDocument } from '../types/rnd-task.types';
import { AppError } from '../../../utils/apiError';

// ── R&D Project Services ────────────────────────────────────────────
export const createProject = async (data: CreateProjectInput): Promise<IRndProjectDocument> =>
    RndProject.create(data);

export const getAllProjects = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, status } = query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        RndProject.find(filter)
            .populate('members', 'firstName lastName email role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        RndProject.countDocuments(filter),
    ]);
    return { 
        data, 
        pagination: { 
            page: Number(page), 
            limit: Number(limit), 
            total, 
            pages: Math.ceil(total / Number(limit)) 
        } 
    };
};

export const getProjectById = async (id: string): Promise<IRndProjectDocument> => {
    const doc = await RndProject.findById(id)
        .populate('members', 'firstName lastName email role avatarUrl');
    if (!doc) throw new AppError('Project not found', 404);
    return doc;
};

export const updateProject = async (id: string, data: UpdateProjectInput): Promise<IRndProjectDocument> => {
    const doc = await RndProject.findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .populate('members', 'firstName lastName email role');
    if (!doc) throw new AppError('Project not found', 404);
    return doc;
};

export const deleteProject = async (id: string): Promise<void> => {
    const doc = await RndProject.findByIdAndDelete(id);
    if (!doc) throw new AppError('Project not found', 404);
};

// ── R&D Task Services ───────────────────────────────────────────────
export const createTask = async (data: CreateTaskInput): Promise<IRndTaskDocument> =>
    RndTask.create(data);

export const getAllTasks = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 50, status, type, assigneeId, projectId } = query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (assigneeId) filter.assigneeId = assigneeId;
    if (projectId) filter.projectId = projectId;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        RndTask.find(filter)
            .populate('assigneeId', 'firstName lastName email avatarUrl')
            .populate('projectId', 'title status')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        RndTask.countDocuments(filter),
    ]);
    return { 
        data, 
        pagination: { 
            page: Number(page), 
            limit: Number(limit), 
            total, 
            pages: Math.ceil(total / Number(limit)) 
        } 
    };
};

export const getTaskById = async (id: string): Promise<IRndTaskDocument> => {
    const doc = await RndTask.findById(id)
        .populate('assigneeId', 'firstName lastName email avatarUrl')
        .populate('projectId', 'title description status');
    if (!doc) throw new AppError('Task not found', 404);
    return doc;
};

export const updateTask = async (id: string, data: UpdateTaskInput): Promise<IRndTaskDocument> => {
    const doc = await RndTask.findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .populate('assigneeId', 'firstName lastName email')
        .populate('projectId', 'title status');
    if (!doc) throw new AppError('Task not found', 404);
    return doc;
};

export const deleteTask = async (id: string): Promise<void> => {
    const doc = await RndTask.findByIdAndDelete(id);
    if (!doc) throw new AppError('Task not found', 404);
};
