import { z } from 'zod';
import { Punctuality, LateDurationType, DevicePickupType, OrderType } from '../types/work-order.types';

const taskStageSchema = z.object({
    stageName:   z.enum(['First', 'Second', 'Third']),
    completed:   z.boolean(),
    completedAt: z.string().optional(),
    reason:      z.string().optional(),
});

const sparePartUsedSchema = z.object({
    inventoryItem: z.string().min(1),
    quantity:      z.number().positive(),
    notes:         z.string().optional(),
});

export const createWorkOrderSchema = z.object({
    customer:             z.string().min(1, 'Customer ID is required'),
    assignedEngineer:     z.string().min(1, 'Engineer ID is required'),
    salesOrder:           z.string().optional(),
    customerOrder:        z.string().optional(),
    typeOfOrder:          z.nativeEnum(OrderType),
    issue:                z.string().min(1, 'Issue description is required'),
    visitSiteDate:        z.string().optional(),
    startMaintenanceDate: z.string().optional(),
    endMaintenanceDate:   z.string().optional(),
    punctuality:          z.nativeEnum(Punctuality).optional(),
    lateDuration:         z.number().optional(),
    lateDurationType:     z.nativeEnum(LateDurationType).optional(),
    reasonForDelay:       z.string().optional(),
    taskCompletedStages:  z.array(taskStageSchema).optional(),
    devicePickupType:     z.nativeEnum(DevicePickupType).optional(),
    deviceReturned:       z.boolean().optional(),
    deviceReturnedDate:   z.string().optional(),
    sparePartsUsed:       z.array(sparePartUsedSchema).optional(),
    notes:                z.string().optional(),
});

export const updateWorkOrderSchema = createWorkOrderSchema.partial();
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
