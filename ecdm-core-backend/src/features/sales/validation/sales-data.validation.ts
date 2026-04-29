import { z } from 'zod';
import { SalesDataCallOutcome, YesNo } from '../types/sales-data.types';
import { CustomerSector } from '../../shared/types/contact.types';

const TYPE_OF_ORDER = ['', 'Maintenance', 'General supplies', 'Supply and installation'] as const;
const SALES_PLATFORM = ['', 'Online', 'In Side', 'Phone', 'Out side', 'Data'] as const;

export const createSalesDataSchema = z.object({
    marketingData: z.string().optional(),
    salesPerson:   z.string().optional(),
    customer:      z.string().optional(),
    
    // Support for creating/linking a customer on-the-fly
    customerName:    z.string().optional(),
    customerPhone:   z.string().optional(),
    customerAddress: z.string().optional(),
    customerRegion:  z.string().optional(),
    customerSector:  z.nativeEnum(CustomerSector).optional(),

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

