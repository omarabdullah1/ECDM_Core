import { z } from 'zod';
import { CustomerOrderStatus } from '../types/customer-order.types';

export const createCustomerOrderSchema = z.object({
    customer:           z.string().min(1, 'Customer ID is required'),
    salesOrder:         z.string().min(1, 'Sales order ID is required'),
    workOrders:         z.array(z.string()).optional(),
    serviceDescription: z.string().min(1, 'Service description is required'),
    scheduledDate:      z.string().optional(),
    completedDate:      z.string().optional(),
    status:             z.nativeEnum(CustomerOrderStatus).optional(),
    notes:              z.string().max(2000).optional(),
});

export const updateCustomerOrderSchema = createCustomerOrderSchema.partial();
export type CreateCustomerOrderInput = z.infer<typeof createCustomerOrderSchema>;
export type UpdateCustomerOrderInput = z.infer<typeof updateCustomerOrderSchema>;
