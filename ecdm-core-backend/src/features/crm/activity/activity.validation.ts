import { z } from 'zod';
import { ActivityType } from './activity.types';

export const createActivitySchema = z.object({
    type: z.nativeEnum(ActivityType),
    subject: z.string().min(1, 'Subject is required').max(200),
    description: z.string().max(3000).optional(),
    relatedClient: z.string().optional(),
    relatedLead: z.string().optional(),
    date: z.string().optional(),
    duration: z.number().min(0).optional(),
});

export const updateActivitySchema = createActivitySchema.partial();
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
