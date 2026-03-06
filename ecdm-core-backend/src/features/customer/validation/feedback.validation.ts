import { z } from 'zod';

export const createFeedbackSchema = z.object({
    customerId:            z.string().min(1, 'Customer ID is required'),
    customerOrderId:       z.string().optional(), // To inherit Engineer & Dates
    
    // Feedback specific fields
    solvedIssue:           z.enum(['Yes', 'No', '']).optional(),
    ratingOperation:       z.string().optional(), // e.g., '1 to 5', 'Excellent', etc.
    followUp:              z.enum(['Yes', 'No', '']).optional(), // Does this need another follow-up?
    ratingCustomerService: z.string().optional(),
    notes:                 z.string().optional(),
    
    // Audit
    updatedBy:             z.string().optional(),
});

export const updateFeedbackSchema = createFeedbackSchema.partial();
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
