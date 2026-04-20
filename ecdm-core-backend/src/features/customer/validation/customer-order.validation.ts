import { z } from 'zod';
import { DevicePickupType, DealStatus, PaymentMethod, ExtraExpenseType } from '../types/customer-order.types';

export const createCustomerOrderSchema = z.object({
    customerId:           z.string().min(1, 'Customer ID is required'),
    salesOrderId:         z.string().min(1, 'Sales order ID is required'),
    
    // Inherited fields
    typeOfOrder:          z.string().optional(),
    issue:                z.string().optional(),
    scheduledVisitDate:   z.string().or(z.date()).optional(),
    
    // Operational fields
    engineerName:         z.string().optional(),
    actualVisitDate:      z.string().or(z.date()).optional(),
    devicePickupType:     z.nativeEnum(DevicePickupType).optional(),
    deal:                 z.nativeEnum(DealStatus).optional(),
    cost:                 z.number().optional(),
    
    // Financial tracking
    paidAmount:           z.number().optional(),
    paymentMethod:        z.nativeEnum(PaymentMethod).optional(),
    spareParts:           z.string().optional(),
    extraExpenseType:     z.nativeEnum(ExtraExpenseType).optional(),
    extraExpenseAmount:   z.number().optional(),
    salesPercentage:      z.number().min(0).max(100).optional(),
    technicianPercentage: z.number().min(0).max(100).optional(),
    engineerPercentage:   z.number().min(0).max(100).optional(),
    // Personnel references
    salesPersonId:        z.string().optional().nullable(),
    technicianId:         z.string().optional().nullable(),
    engineerId:           z.string().optional().nullable(),
    
    startDate:            z.string().or(z.date()).optional(),
    endDate:              z.string().or(z.date()).optional(),
    deviceReturnedDate:   z.string().or(z.date()).optional(),
    notes:                z.string().max(2000).optional(),
    
    // Tracking
    updatedBy:            z.string().optional(),
});

export const updateCustomerOrderSchema = createCustomerOrderSchema.partial();
export type CreateCustomerOrderInput = z.infer<typeof createCustomerOrderSchema>;
export type UpdateCustomerOrderInput = z.infer<typeof updateCustomerOrderSchema>;
