import WorkOrder from '../models/work-order.model';
import { InventoryFinance } from '../../finance/models/inventory-finance.model';
import StockMovement from '../models/stock-movement.model';
import { AppError } from '../../../utils/apiError';
import { Types } from 'mongoose';
import { MovementType } from '../types/inventory-plus.types';
import { TaskCompleted } from '../types/work-order.types';

interface PartInput {
    inventoryItemId: string;
    quantity: number;
}

interface AddPartsResult {
    workOrder: any;
    stockMovements: any[];
    insufficientStock: string[];
}

/**
 * Add parts to a work order and automatically deduct from inventory
 * Called when work order is completed and parts are consumed
 */
export const addPartsToWorkOrder = async (
    workOrderId: string,
    parts: PartInput[],
    performedBy: string,
    reason: string = 'Used in work order'
): Promise<AddPartsResult> => {
    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
        throw new AppError('Work order not found', 404);
    }

    const stockMovements: any[] = [];
    const insufficientStock: string[] = [];
    const processedParts: any[] = [];

    // Process each part
    for (const part of parts) {
        // Get inventory item from InventoryFinance
        const inventoryItem = await InventoryFinance.findById(part.inventoryItemId);
        if (!inventoryItem) {
            throw new AppError(`Inventory item not found: ${part.inventoryItemId}`, 404);
        }

        // Check if sufficient stock exists
        if (inventoryItem.stockNumber < part.quantity) {
            insufficientStock.push(`${inventoryItem.itemName}: requested ${part.quantity}, available ${inventoryItem.stockNumber}`);
            continue; // Skip this part
        }

        // Deduct from inventory
        await InventoryFinance.findByIdAndUpdate(part.inventoryItemId, {
            $inc: { stockNumber: -part.quantity }
        });

        // Create stock movement record
        const movement = await StockMovement.create({
            product: inventoryItem._id,
            type: MovementType.Out,
            quantity: part.quantity,
            reason: `${reason} - Work Order: ${workOrderId}`,
            reference: `WO-${workOrderId.toString().slice(-6)}`,
            performedBy: new Types.ObjectId(performedBy),
        });

        // Add to processed parts
        processedParts.push({
            inventoryItemId: inventoryItem._id,
            quantity: part.quantity,
            unitCost: inventoryItem.price,
        });

        stockMovements.push(movement);
    }

    // If we have parts to add, update work order
    if (processedParts.length > 0) {
        // Merge with existing parts
        const existingParts = workOrder.partsUsed || [];
        const newPartsMap = new Map(existingParts.map(p => [p.inventoryItemId.toString(), p]));
        
        processedParts.forEach(p => {
            const key = p.inventoryItemId.toString();
            if (newPartsMap.has(key)) {
                // Update existing part
                const existing = newPartsMap.get(key)!;
                existing.quantity += p.quantity;
            } else {
                // Add new part
                newPartsMap.set(key, p);
            }
        });

        workOrder.partsUsed = Array.from(newPartsMap.values());
        workOrder.cost.grandTotal = workOrder.cost.partsTotal + workOrder.cost.laborCost + workOrder.cost.otherCosts;
        
        await workOrder.save();
    }

    return {
        workOrder,
        stockMovements,
        insufficientStock,
    };
};

/**
 * Deduct inventory when a work order is marked as completed
 * This is the main integration point between WorkOrder and Inventory
 */
export const deductInventoryOnCompletion = async (
    workOrderId: string,
    performedBy: string
): Promise<{ success: boolean; message: string; stockMovements?: any[]; actualCost?: number }> => {
    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
        throw new AppError('Work order not found', 404);
    }

    // Check if already completed
    if (workOrder.taskCompleted === TaskCompleted.Yes) {
        return {
            success: false,
            message: 'Work order is already marked as completed',
        };
    }

    // SAFETY CHECK: Validate stock availability before deducting
    if (workOrder.partsUsed && workOrder.partsUsed.length > 0) {
        for (const part of workOrder.partsUsed) {
            const inventoryItem = await InventoryFinance.findById(part.inventoryItemId);
            if (!inventoryItem) {
                throw new AppError(`Inventory item not found: ${part.inventoryItemId}`, 404);
            }
            if (inventoryItem.stockNumber < part.quantity) {
                throw new AppError(
                    `Insufficient stock for ${inventoryItem.itemName}: requested ${part.quantity}, available ${inventoryItem.stockNumber}`,
                    400
                );
            }
        }
    }

    // Mark as completed
    workOrder.taskCompleted = TaskCompleted.Yes;
    workOrder.endMaintenanceDate = new Date();

    let actualCost = 0;
    const stockMovements: any[] = [];

    // Process parts and deduct from inventory
    if (workOrder.partsUsed && workOrder.partsUsed.length > 0) {
        for (const part of workOrder.partsUsed) {
            // Deduct from InventoryFinance stockNumber
            await InventoryFinance.findByIdAndUpdate(part.inventoryItemId, {
                $inc: { stockNumber: -part.quantity }
            });

            // Create stock movement record
            const movement = await StockMovement.create({
                product: part.inventoryItemId,
                type: MovementType.Out,
                quantity: part.quantity,
                reason: `Used in completed work order - ${workOrderId}`,
                reference: `WO-${workOrderId.toString().slice(-6)}`,
                performedBy: new Types.ObjectId(performedBy),
            });

            // Calculate actual cost
            actualCost += part.quantity * part.unitCost;
            stockMovements.push(movement);
        }
    }

    // Save the actual cost to work order
    workOrder.actualCost = actualCost;
    await workOrder.save();

    return {
        success: true,
        message: `Work order completed. ${stockMovements.length} stock movements recorded.`,
        stockMovements,
        actualCost,
    };
};

/**
 * Get inventory cost summary for a work order
 */
export const getWorkOrderInventoryCost = async (workOrderId: string) => {
    const workOrder = await WorkOrder.findById(workOrderId).populate('partsUsed.inventoryItemId');
    if (!workOrder) {
        throw new AppError('Work order not found', 404);
    }

    const partsDetails = workOrder.partsUsed.map(part => ({
        inventoryItemId: part.inventoryItemId,
        quantity: part.quantity,
        unitCost: part.unitCost,
        totalCost: part.quantity * part.unitCost,
        inStock: true,
    }));

    return {
        workOrderId: workOrder._id,
        partsCount: workOrder.partsUsed.length,
        partsDetails,
        cost: workOrder.cost,
    };
};

/**
 * Get work orders that need inventory deduction (completed but no parts processed)
 */
export const getPendingInventoryDeductions = async () => {
    const workOrders = await WorkOrder.find({
        taskCompleted: TaskCompleted.Yes,
        $expr: { $gt: [{ $size: { $ifNull: ['$partsUsed', []] } }, 0] },
    })
        .populate({
            path: 'customerOrderId',
            populate: { path: 'customerId' },
        })
        .select('customerOrderId partsUsed cost createdAt');

    // Filter to only those without stock movements for their parts
    const pendingDeductions = [];

    for (const wo of workOrders) {
        // Check if stock movements exist for this work order's parts
        const movements = await StockMovement.find({
            reference: { $regex: `WO-${wo._id.toString().slice(-6)}` },
        });

        if (movements.length === 0) {
            pendingDeductions.push(wo);
        }
    }

    return pendingDeductions;
};

/**
 * Rollback inventory deduction for a work order
 * Used when work order is un-completed or parts need to be returned
 */
export const rollbackInventoryDeduction = async (
    workOrderId: string,
    _performedBy?: string
): Promise<{ success: boolean; message: string; returnedItems: any[] }> => {
    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
        throw new AppError('Work order not found', 404);
    }

    // Check if there are parts to return
    if (!workOrder.partsUsed || workOrder.partsUsed.length === 0) {
        return {
            success: false,
            message: 'No parts to rollback',
            returnedItems: [],
        };
    }

    // Delete stock movements for this work order
    const movements = await StockMovement.deleteMany({
        reference: { $regex: `WO-${workOrderId.toString().slice(-6)}` },
    });

    // Return parts to inventory
    const returnedItems = [];
    for (const part of workOrder.partsUsed) {
        await InventoryFinance.findByIdAndUpdate(part.inventoryItemId, {
            $inc: { stockNumber: part.quantity }
        });
        returnedItems.push({
            inventoryItemId: part.inventoryItemId,
            quantity: part.quantity,
        });
    }

    // Clear parts from work order
    workOrder.partsUsed = [];
    workOrder.actualCost = 0;
    workOrder.cost = {
        partsTotal: 0,
        laborCost: 0,
        otherCosts: 0,
        grandTotal: 0,
    };
    await workOrder.save();

    return {
        success: true,
        message: `Rolled back ${movements.deletedCount} stock movements and returned ${returnedItems.length} items`,
        returnedItems,
    };
};
