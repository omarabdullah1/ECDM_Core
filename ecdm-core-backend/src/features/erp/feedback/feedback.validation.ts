import { z } from 'zod';

export const createFeedbackSchema = z.object({
    workOrder:             z.string().min(1, 'Work order ID is required'),
    customer:              z.string().min(1, 'Customer ID is required'),
    engineer:              z.string().min(1, 'Engineer (user) ID is required'),
    ratingOperation:       z.number().int().min(1).max(5),
    ratingCustomerService: z.number().int().min(1).max(5),
    notes:                 z.string().optional(),
});

export const updateFeedbackSchema = createFeedbackSchema.partial();
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
