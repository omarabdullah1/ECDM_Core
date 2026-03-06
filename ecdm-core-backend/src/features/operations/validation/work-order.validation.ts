import { z } from 'zod';
import { Punctuality, TaskCompleted, SparePartsAvailability } from '../types/work-order.types';

/**
 * Work Order Validation - Maintenance/Workshop Module
 * 
 * Validates input for creating and updating Work Orders.
 * Most fields are optional as Work Orders are auto-created with just customerOrderId.
 */

export const createWorkOrderSchema = z.object({
    customerOrderId:       z.string().min(1, 'Customer Order ID is required'),
    taskDate:              z.string().optional(),
    maintenanceEngineer:   z.string().optional().default(''),
    startMaintenanceDate:  z.string().optional(),
    endMaintenanceDate:    z.string().optional(),
    punctuality:           z.nativeEnum(Punctuality).optional().default(Punctuality.Empty),
    reasonForDelay:        z.string().optional().default(''),
    taskCompleted:         z.nativeEnum(TaskCompleted).optional().default(TaskCompleted.Empty),
    reasonForIncompletion: z.string().optional().default(''),
    rating:                z.string().optional().default(''),
    sparePartsId:          z.string().optional().default(''),
    sparePartsAvailability: z.nativeEnum(SparePartsAvailability).optional().default(SparePartsAvailability.Empty),
    notes:                 z.string().optional().default(''),
    updatedBy:             z.string().optional(),
});

export const updateWorkOrderSchema = createWorkOrderSchema.partial().omit({ customerOrderId: true });

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
