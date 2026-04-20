import WorkOrder from '../models/work-order.model';
import { AppError } from '../../../utils/apiError';
import { CreateWorkOrderInput, UpdateWorkOrderInput } from '../validation/work-order.validation';
import * as priceListService from './price-list.service';

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
export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customerOrderId, maintenanceEngineer, punctuality, taskCompleted } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (customerOrderId)     filter.customerOrderId     = customerOrderId;
    if (maintenanceEngineer) filter.maintenanceEngineer = { $regex: escapeRegex(maintenanceEngineer as string), $options: 'i' };
    if (punctuality)         filter.punctuality         = punctuality;
    if (taskCompleted)       filter.taskCompleted       = taskCompleted;

    const [data, total] = await Promise.all([
        WorkOrder.find(filter)
            .populate({
                path: 'customerOrderId',
                populate: { path: 'customerId' }   // Deep populate Customer from CustomerOrder
            })
            .populate('updatedBy', 'email name')
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
            populate: { path: 'customerId' }   // Deep populate Customer from CustomerOrder
        })
        .populate('updatedBy', 'email name');
    if (!item) throw new AppError('Work order not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateWorkOrderInput) => {
    // ─── Inventory Check: Prevent adding parts with 0 stock ───
    if ((data as any).partsUsed && (data as any).partsUsed.length > 0) {
        const previousOrder = await WorkOrder.findById(id);
        const existingPartsMap = new Map();
        previousOrder?.partsUsed?.forEach(p => existingPartsMap.set(p.priceListId.toString(), p.quantity));

        const itemsToDeduct: { priceListId: string, quantity: number }[] = [];

        // ─── Map inventoryItemId to priceListId for compatibility ───
        (data as any).partsUsed = (data as any).partsUsed.map((p: any) => ({
            ...p,
            priceListId: p.priceListId || p.inventoryItemId
        })).filter((p: any) => p.priceListId);

        for (const part of (data as any).partsUsed) {
            const requestedQty = part.quantity;
            const previousQty = existingPartsMap.get(part.priceListId.toString()) || 0;
            const diff = requestedQty - previousQty;

            if (diff > 0) {
                // We only need to check availability for the "extra" quantity requested
                itemsToDeduct.push({
                    priceListId: part.priceListId.toString(),
                    quantity: diff
                });
            }
        }

        if (itemsToDeduct.length > 0) {
            console.log('🛡️ Inventory: Validating availability for Work Order parts diff...');
            await priceListService.checkAvailability(itemsToDeduct);
            
            // Deduct the stock
            for (const item of itemsToDeduct) {
                await priceListService.adjustStock(item.priceListId, -item.quantity);
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
