import { z } from 'zod';
import { SalesDataCallOutcome, YesNo } from '../types/sales-data.types';

const TYPE_OF_ORDER = ['', 'Maintenance', 'General supplies', 'Supply and installation'] as const;
const SALES_PLATFORM = ['', 'Online', 'In Side', 'Phone', 'Out side', 'Data'] as const;

export const createSalesDataSchema = z.object({
    marketingData: z.string().min(1, 'Marketing data record ID is required'),
    salesPerson:   z.string().min(1, 'Sales person ID is required'),
    customer:      z.string().optional(),
    callDate:      z.string().optional(),
    callOutcome:   z.nativeEnum(SalesDataCallOutcome).optional(),
    typeOfOrder:   z.enum(TYPE_OF_ORDER).optional(),
    salesPlatform: z.enum(SALES_PLATFORM).optional(),
    issue:         z.string().optional(),
    order:         z.enum(['Yes', 'No', '']).optional(),
    followUp:      z.enum(['Yes', 'No', '']).optional(),
    followUpDate:  z.string().optional(),
    notes:         z.string().max(2000).optional(),
});

export const updateSalesDataSchema = createSalesDataSchema.partial();
export type CreateSalesDataInput = z.infer<typeof createSalesDataSchema>;
export type UpdateSalesDataInput = z.infer<typeof updateSalesDataSchema>;
