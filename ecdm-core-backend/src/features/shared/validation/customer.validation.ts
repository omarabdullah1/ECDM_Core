import { z } from 'zod';
import { CustomerSector, CustomerAgeStatus, CustomerStatus } from '../types/customer.types';

export const createCustomerSchema = z.object({
    name:              z.string().min(1, 'Name is required').max(150),
    phone:             z.string().min(1, 'Phone is required'),
    address:           z.string().optional(),
    region:            z.string().optional(),
    sector:            z.nativeEnum(CustomerSector),
    customerAgeStatus: z.nativeEnum(CustomerAgeStatus).optional(),
    status:            z.nativeEnum(CustomerStatus).optional(),
    notes:             z.string().max(2000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
