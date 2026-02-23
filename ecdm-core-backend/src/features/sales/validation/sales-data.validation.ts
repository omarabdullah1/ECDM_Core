import { z } from 'zod';
import { SalesDataCallOutcome } from '../types/sales-data.types';

export const createSalesDataSchema = z.object({
    marketingData: z.string().min(1, 'Marketing data record ID is required'),
    salesPerson:   z.string().min(1, 'Sales person ID is required'),
    customer:      z.string().optional(),
    callDate:      z.string().optional(),
    callOutcome:   z.nativeEnum(SalesDataCallOutcome).optional(),
    followUpDate:  z.string().optional(),
    notes:         z.string().max(2000).optional(),
});

export const updateSalesDataSchema = createSalesDataSchema.partial();
export type CreateSalesDataInput = z.infer<typeof createSalesDataSchema>;
export type UpdateSalesDataInput = z.infer<typeof updateSalesDataSchema>;
