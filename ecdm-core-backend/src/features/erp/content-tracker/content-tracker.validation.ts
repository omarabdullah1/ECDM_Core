import { z } from 'zod';
import { ContentType, ContentStatus } from './content-tracker.types';

export const createContentTrackerSchema = z.object({
    name:     z.string().min(1, 'Content name is required'),
    type:     z.nativeEnum(ContentType),
    status:   z.nativeEnum(ContentStatus),
    sector:   z.string().optional(),
    postDate: z.string().optional(),
    notes:    z.string().optional(),
});

export const updateContentTrackerSchema = createContentTrackerSchema.partial();
export type CreateContentTrackerInput = z.infer<typeof createContentTrackerSchema>;
export type UpdateContentTrackerInput = z.infer<typeof updateContentTrackerSchema>;
