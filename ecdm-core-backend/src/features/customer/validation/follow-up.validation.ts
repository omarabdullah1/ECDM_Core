import { z } from 'zod';
import { FollowUpStatus } from '../types/follow-up.types';

export const createFollowUpSchema = z.object({
    // Source references (at least one optional, or it's a manual entry)
    workOrder:            z.string().optional(),
    leadId:               z.string().optional(),
    salesDataId:          z.string().optional(),
    
    customer:             z.string().min(1, 'Customer ID is required'),
    csr:                  z.string().optional(),
    status:               z.nativeEnum(FollowUpStatus).optional(),
    solvedIssue:          z.boolean().optional(),
    reasonForNotSolving:  z.string().max(1000).optional(),
    followUpDate:         z.string().min(1, 'Follow-up date is required'),
    notes:                z.string().max(2000).optional(),
});

export const updateFollowUpSchema = createFollowUpSchema.partial();
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
