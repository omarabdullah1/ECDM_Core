import { z } from 'zod';
import { ProjectStatus } from '../types/rnd-project.types';
import { TaskStatus, TaskType } from '../types/rnd-task.types';

// ── R&D Project Validation ─────────────────────────────────────────
export const createProjectSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
    status: z.nativeEnum(ProjectStatus).optional(),
    members: z.array(z.string()).optional(),
});

export const updateProjectSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    members: z.array(z.string()).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ── R&D Task Validation ────────────────────────────────────────────
export const createTaskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
    status: z.nativeEnum(TaskStatus).optional(),
    type: z.nativeEnum(TaskType, { required_error: 'Task type is required' }),
    projectId: z.string().optional(),
    assigneeId: z.string({ required_error: 'Assignee is required' }),
});

export const updateTaskSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    type: z.nativeEnum(TaskType).optional(),
    projectId: z.string().optional(),
    assigneeId: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
