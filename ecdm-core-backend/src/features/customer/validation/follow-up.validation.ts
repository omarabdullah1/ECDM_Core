import { z } from 'zod';

export const createFollowUpSchema = z.object({
    workOrder:            z.string().min(1, 'Work order ID is required'),
    customer:             z.string().min(1, 'Customer ID is required'),
    csr:                  z.string().min(1, 'CSR user ID is required'),
    solvedIssue:          z.boolean(),
    reasonForNotSolving:  z.string().max(1000).optional(),
    followUpDate:         z.string().min(1, 'Follow-up date is required'),
    notes:                z.string().max(2000).optional(),
});

export const updateFollowUpSchema = createFollowUpSchema.partial();
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
