import { z } from 'zod';
import { LeadPlatform, OrderType } from './sales-lead.types';

export const createSalesLeadSchema = z.object({
    customer:         z.string().min(1, 'Customer ID is required'),
    salesPerson:      z.string().min(1, 'Sales person ID is required'),
    platform:         z.nativeEnum(LeadPlatform),
    typeOfOrder:      z.nativeEnum(OrderType),
    followUpRequired: z.boolean().optional(),
    followUpDate:     z.string().optional(),
    notes:            z.string().max(2000).optional(),
});

export const updateSalesLeadSchema = createSalesLeadSchema.partial();
export type CreateSalesLeadInput = z.infer<typeof createSalesLeadSchema>;
export type UpdateSalesLeadInput = z.infer<typeof updateSalesLeadSchema>;
