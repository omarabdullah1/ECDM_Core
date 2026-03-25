import { z } from 'zod';

export const orderContextSchema = z.object({
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerId: z.string().optional(),
    engineerName: z.string().optional(),
    visitDate: z.string().optional(),
    scheduledVisitDate: z.string().optional(),
    actualVisitDate: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    dealStatus: z.string().optional(),
    orderId: z.string().optional(),
});

export const createFeedbackSchema = z.object({
    customerId:            z.string().min(1, 'Customer ID is required'),
    customerOrderId:       z.string().min(1, 'Order reference is required - Feedback must be linked to a specific order'),
    
    // Order Context - Single Source of Truth (inherited from CustomerOrder)
    orderContext:          orderContextSchema.optional(),
    
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
