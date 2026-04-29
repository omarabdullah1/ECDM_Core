import { z } from 'zod';
import { SalesFollowUpStatus } from '../types/sales-followup.types';

export const createSalesFollowUpSchema = z.object({
    salesData:     z.string().min(1, 'SalesData ID is required'),
    customer:      z.string().min(1, 'Customer ID is required'),
    salesPerson:   z.string().optional(),
    status:        z.nativeEnum(SalesFollowUpStatus).optional(),
    scheduledDate: z.string().optional(),
    completedDate: z.string().optional(),
    notes:         z.string().max(2000).optional(),
});

export const updateSalesFollowUpSchema = z.object({
    status:        z.nativeEnum(SalesFollowUpStatus).optional(),
    scheduledDate: z.string().optional(),
    completedDate: z.string().optional(),
    notes:         z.string().max(2000).optional(),
    salesPerson:   z.string().optional(),
});

export type CreateSalesFollowUpInput = z.infer<typeof createSalesFollowUpSchema>;
export type UpdateSalesFollowUpInput = z.infer<typeof updateSalesFollowUpSchema>;

