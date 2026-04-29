import WorkOrder from '../models/work-order.model';
import { AppError } from '../../../utils/apiError';
import { CreateWorkOrderInput, UpdateWorkOrderInput } from '../validation/work-order.validation';
import * as InventoryService from './inventory.service';

/**
 * Escape special regex characters to prevent ReDoS/injection attacks.
 */
const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Work Order Service - Maintenance/Workshop Module
 * 
 * Handles CRUD operations for Work Orders.
 * Uses deep population to show inherited data from CustomerOrder → Customer chain.
 */

export const create = async (data: CreateWorkOrderInput) => WorkOrder.create(data);

/**
 * GET ALL Work Orders with deep population
 * Populates: customerOrderId → customerId (for displaying the 28-column table)
 */
export const getAll = async (query: Record<string, unknown>, user?: any) => {
    const { page = 1, limit = 10, customerOrderId, maintenanceEngineer, punctuality, taskCompleted } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (customerOrderId)     filter.customerOrderId     = customerOrderId;
    if (maintenanceEngineer) filter.maintenanceEngineer = { $regex: escapeRegex(maintenanceEngineer as string), $options: 'i' };
    if (punctuality)         filter.punctuality         = punctuality;
    if (taskCompleted)       filter.taskCompleted       = taskCompleted;

    // ─── Restricted Access for Operation Members ───
    if (user?.role && (require('../../../utils/makerChecker').isOperationMember(user.role))) {
        // Filter by engineerId (the primary link in WorkOrder)
        // We could also join with CustomerOrder to check technicianId if needed,
        // but WorkOrder usually has engineerId set for the maintenance person.
        filter.engineerId = user.userId;
    }

    const [data, total] = await Promise.all([
        WorkOrder.find(filter)
            .populate({
                path: 'customerOrderId',
                populate: [
                    { path: 'customerId' },
                    { path: 'technicianId', select: 'fullName name email' }
                ]
            })
            .populate('updatedBy', 'email name')
            .populate('partsUsed.inventoryId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        WorkOrder.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };
};

/**
 * GET BY ID with deep population
 */
export const getById = async (id: string) => {
    const item = await WorkOrder.findById(id)
        .populate({
            path: 'customerOrderId',
            populate: [
                { path: 'customerId' },
                { path: 'technicianId', select: 'fullName name email' }
            ]
        })
        .populate('updatedBy', 'email name')
        .populate('partsUsed.inventoryId');
    if (!item) throw new AppError('Work order not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateWorkOrderInput) => {
    // ─── Inventory Check: Prevent adding parts with 0 stock ───
    if ((data as any).partsUsed && (data as any).partsUsed.length > 0) {
        const previousOrder = await WorkOrder.findById(id);
        const existingPartsMap = new Map();
        previousOrder?.partsUsed?.forEach(p => existingPartsMap.set(p.inventoryId.toString(), p.quantity));

        const itemsToDeduct: { inventoryId: string, quantity: number }[] = [];

        // ─── Standardize partsUsed: Handle legacy fields and ensure valid inventoryId ───
        (data as any).partsUsed = ((data as any).partsUsed || []).map((p: any) => {
            const id = p.inventoryId || p.inventoryItemId || p.InventoryItemId;
            return {
                ...p,
                inventoryId: id ? String(id) : undefined
            };
        }).filter((p: any) => p.inventoryId && p.inventoryId.trim() !== '');

        for (const part of (data as any).partsUsed) {
            const requestedQty = part.quantity;
            const previousQty = existingPartsMap.get(part.inventoryId.toString()) || 0;
            const diff = requestedQty - previousQty;

            if (diff > 0) {
                // We only need to check availability for the "extra" quantity requested
                itemsToDeduct.push({
                    inventoryId: part.inventoryId.toString(),
                    quantity: diff
                });
            }
        }

        if (itemsToDeduct.length > 0) {
            console.log('🛡️ Inventory: Validating availability for Work Order parts diff...');
            await InventoryService.checkAvailability(itemsToDeduct);
            
            // Deduct the stock
            for (const item of itemsToDeduct) {
                await InventoryService.adjustStock(item.inventoryId, -item.quantity);
            }
        }
    }

    const item = await WorkOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Work order not found', 404);

    // ℹ️ NOTE: Invoice generation is intentionally NOT triggered here.
    // Invoices must be created/updated explicitly by the user via the
    // Inventory Finance or Order Finance UI (manual action only).

    return item;
};

export const deleteWorkOrder = async (id: string) => {
    const item = await WorkOrder.findByIdAndDelete(id);
    if (!item) throw new AppError('Work order not found', 404);
};

/**
 * Bulk delete multiple work orders by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await WorkOrder.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};


