import { z } from 'zod';
import { FollowUpStatus } from '../types/follow-up.types';

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

export const createFollowUpSchema = z.object({
    // Source references (at least one optional, or it's a manual entry)
    workOrder:            z.string().optional(),
    leadId:               z.string().optional(),
    salesDataId:          z.string().optional(),
    customerOrderId:      z.string().optional(),  // Reference to Customer Order
    
    // Order Context - Single Source of Truth (inherited from CustomerOrder)
    orderContext:         orderContextSchema.optional(),
    
    customer:             z.string().min(1, 'Customer ID is required'),
    csr:                  z.string().optional(),
    status:               z.nativeEnum(FollowUpStatus).optional(),
    
    // Quality Control Fields
    punctuality:          z.enum(['Same Visit Time', 'Late', '']).optional(),
    reasonForDelay:       z.string().optional(),
    solvedIssue:          z.enum(['Yes', 'No', '']).optional(),
    reasonForNotSolving:  z.string().max(1000).optional(),
    followUp:            z.boolean().optional().nullable(),
    
    followUpDate:         z.string().min(1, 'Follow-up date is required'),
    notes:                z.string().max(2000).optional(),
    updatedBy:            z.string().optional(),
});

export const updateFollowUpSchema = createFollowUpSchema.partial();
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;

