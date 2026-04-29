import { z } from 'zod';
import { TaskStatus, TaskPriority } from './task.types';

export const createTaskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(3000).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assignedTo: z.string().optional(),
    relatedClient: z.string().optional(),
    dueDate: z.string().optional(),
    tags: z.array(z.string()).optional(),
    estimatedHours: z.number().min(0).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

