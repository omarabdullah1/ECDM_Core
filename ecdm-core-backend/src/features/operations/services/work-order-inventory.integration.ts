import mongoose, { Types } from 'mongoose';
import WorkOrder from '../models/work-order.model';
import { InventoryFinance } from '../../finance/models/inventory-finance.model';
import StockMovement from '../models/stock-movement.model';
import { AppError } from '../../../utils/apiError';
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

export const addPartsToWorkOrder = async (
    workOrderId: string,
    parts: PartInput[],
    performedBy: string,
    reason: string = 'Used in work order'
): Promise<AddPartsResult> => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const workOrder = await WorkOrder.findById(workOrderId).session(session);
        if (!workOrder) {
            throw new AppError('Work order not found', 404);
        }

        const stockMovements: any[] = [];
        const insufficientStock: string[] = [];
        const processedParts: any[] = [];

        for (const part of parts) {
            const inventoryItem = await InventoryFinance.findById(part.inventoryItemId).session(session);
            if (!inventoryItem) {
                throw new AppError(`Inventory item not found: ${part.inventoryItemId}`, 404);
            }

            if (inventoryItem.stockNumber < part.quantity) {
                insufficientStock.push(`${inventoryItem.itemName}: requested ${part.quantity}, available ${inventoryItem.stockNumber}`);
                continue;
            }

            await InventoryFinance.findByIdAndUpdate(part.inventoryItemId, {
                $inc: { stockNumber: -part.quantity }
            }, { session });

            const movement = await StockMovement.create([{
                product: inventoryItem._id,
                type: MovementType.Out,
                quantity: part.quantity,
                reason: `${reason} - Work Order: ${workOrderId}`,
                reference: `WO-${workOrderId.toString().slice(-6)}`,
                performedBy: new Types.ObjectId(performedBy),
            }], { session });

            processedParts.push({
                inventoryItemId: inventoryItem._id,
                quantity: part.quantity,
                unitCost: inventoryItem.price,
            });

            stockMovements.push(movement[0]);
        }

        if (processedParts.length > 0) {
            const existingParts = workOrder.partsUsed || [];
            const newPartsMap = new Map(existingParts.map(p => [p.inventoryItemId.toString(), p]));
            
            processedParts.forEach(p => {
                const key = p.inventoryItemId.toString();
                if (newPartsMap.has(key)) {
                    const existing = newPartsMap.get(key)!;
                    existing.quantity += p.quantity;
                } else {
                    newPartsMap.set(key, p);
                }
            });

            workOrder.partsUsed = Array.from(newPartsMap.values());
            workOrder.cost.grandTotal = workOrder.cost.partsTotal + workOrder.cost.laborCost + workOrder.cost.otherCosts;
            
            await workOrder.save({ session });
        }

        await session.commitTransaction();
        
        return {
            workOrder,
            stockMovements,
            insufficientStock,
        };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const deductInventoryOnCompletion = async (
    workOrderId: string,
    performedBy: string
): Promise<{ success: boolean; message: string; stockMovements?: any[]; actualCost?: number }> => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const workOrder = await WorkOrder.findById(workOrderId).session(session);
        if (!workOrder) {
            throw new AppError('Work order not found', 404);
        }

        if (workOrder.taskCompleted === TaskCompleted.Yes) {
            return {
                success: false,
                message: 'Work order is already marked as completed',
            };
        }

        if (workOrder.partsUsed && workOrder.partsUsed.length > 0) {
            for (const part of workOrder.partsUsed) {
                const inventoryItem = await InventoryFinance.findById(part.inventoryItemId).session(session);
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

        workOrder.taskCompleted = TaskCompleted.Yes;
        workOrder.endMaintenanceDate = new Date();

        let actualCost = 0;
        const stockMovements: any[] = [];

        if (workOrder.partsUsed && workOrder.partsUsed.length > 0) {
            for (const part of workOrder.partsUsed) {
                await InventoryFinance.findByIdAndUpdate(part.inventoryItemId, {
                    $inc: { stockNumber: -part.quantity }
                }, { session });

                const movement = await StockMovement.create([{
                    product: part.inventoryItemId,
                    type: MovementType.Out,
                    quantity: part.quantity,
                    reason: `Used in completed work order - ${workOrderId}`,
                    reference: `WO-${workOrderId.toString().slice(-6)}`,
                    performedBy: new Types.ObjectId(performedBy),
                }], { session });

                actualCost += part.quantity * part.unitCost;
                stockMovements.push(movement[0]);
            }
        }

        workOrder.actualCost = actualCost;
        await workOrder.save({ session });

        await session.commitTransaction();

        return {
            success: true,
            message: `Work order completed. ${stockMovements.length} stock movements recorded.`,
            stockMovements,
            actualCost,
        };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
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

export const rollbackInventoryDeduction = async (
    workOrderId: string,
    _performedBy?: string
): Promise<{ success: boolean; message: string; returnedItems: any[] }> => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const workOrder = await WorkOrder.findById(workOrderId).session(session);
        if (!workOrder) {
            throw new AppError('Work order not found', 404);
        }

        if (!workOrder.partsUsed || workOrder.partsUsed.length === 0) {
            return {
                success: false,
                message: 'No parts to rollback',
                returnedItems: [],
            };
        }

        const movements = await StockMovement.deleteMany({
            reference: { $regex: `WO-${workOrderId.toString().slice(-6)}` },
        }).session(session);

        const returnedItems = [];
        for (const part of workOrder.partsUsed) {
            await InventoryFinance.findByIdAndUpdate(part.inventoryItemId, {
                $inc: { stockNumber: part.quantity }
            }, { session });
            returnedItems.push({
                inventoryItemId: part.inventoryItemId,
                quantity: part.quantity,
            });
        }

        workOrder.partsUsed = [];
        workOrder.actualCost = 0;
        workOrder.cost = {
            partsTotal: 0,
            laborCost: 0,
            otherCosts: 0,
            grandTotal: 0,
        };
        await workOrder.save({ session });

        await session.commitTransaction();

        return {
            success: true,
            message: `Rolled back ${movements.deletedCount} stock movements and returned ${returnedItems.length} items`,
            returnedItems,
        };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};
