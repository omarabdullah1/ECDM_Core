import { z } from 'zod';
import { FollowUpStatus } from '../types/follow-up.types';

export const createFollowUpSchema = z.object({
    // Source references (at least one optional, or it's a manual entry)
    workOrder:            z.string().optional(),
    leadId:               z.string().optional(),
    salesDataId:          z.string().optional(),
    customerOrderId:      z.string().optional(),  // New: Reference to Customer Order
    
    customer:             z.string().min(1, 'Customer ID is required'),
    csr:                  z.string().optional(),
    status:               z.nativeEnum(FollowUpStatus).optional(),
    
    // Quality Control Fields
    punctuality:          z.enum(['Same Visit Time', 'Late', '']).optional(),
    reasonForDelay:       z.string().optional(),
    solvedIssue:          z.enum(['Yes', 'No', '']).optional(),  // Changed from boolean to string enum
    reasonForNotSolving:  z.string().max(1000).optional(),
    
    followUpDate:         z.string().min(1, 'Follow-up date is required'),
    notes:                z.string().max(2000).optional(),
    updatedBy:            z.string().optional(),  // New: Track who modified
});

export const updateFollowUpSchema = createFollowUpSchema.partial();
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
