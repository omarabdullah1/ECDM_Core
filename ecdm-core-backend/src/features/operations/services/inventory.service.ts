import { AppError } from '../../../utils/apiError';
import Inventory from '../models/inventory.model';
import { InventoryQueryParams } from '../types/inventory.types';
import { CreateInventoryInput, UpdateInventoryInput } from '../validation/inventory.validation';

/**
 * Inventory Service — Business Logic Layer
 */

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const create = async (data: CreateInventoryInput) => {
    return Inventory.create(data);
};

// ─── READ ALL ─────────────────────────────────────────────────────────────────

export const getAll = async (query: InventoryQueryParams, user?: any) => {
    const { page = 1, limit = 10, search, category } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};

    // ─── Restricted Access for Operation Members (DEPRECATED) ───
    /* 
       Operation members (Engineers/Technicians) can now see the inventory list.
       Frontend handles hiding sensitive financial data (prices/costs).
    */


    if (category) {
        filter.category = category;
    }

    if (search) {
        const searchCriteria = [
            { itemName: { $regex: search, $options: 'i' } },
            { specification: { $regex: search, $options: 'i' } },
            { sparePartsId: { $regex: search, $options: 'i' } },
        ];
        
        if (filter.$or) {
            // Merge with existing filters if any (unlikely for inventory but safe)
            filter.$and = [{ $or: filter.$or }, { $or: searchCriteria }];
            delete filter.$or;
        } else {
            filter.$or = searchCriteria;
        }
    }

    const [data, total] = await Promise.all([
        Inventory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Inventory.countDocuments(filter),
    ]);

    return {
        data,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
        },
    };
};

// ─── READ BY ID ───────────────────────────────────────────────────────────────

export const getById = async (id: string) => {
    const item = await Inventory.findById(id);
    if (!item) throw new AppError('Inventory item not found', 404);
    return item;
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const update = async (id: string, data: UpdateInventoryInput) => {
    const item = await Inventory.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });
    if (!item) throw new AppError('Inventory item not found', 404);
    return item;
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const remove = async (id: string) => {
    const item = await Inventory.findByIdAndDelete(id);
    if (!item) throw new AppError('Inventory item not found', 404);
};

// ─── BULK DELETE ──────────────────────────────────────────────────────────────

export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await Inventory.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

// ─── STOCK MANAGEMENT HELPERS ────────────────────────────────────────────────

/**
 * Checks if requested quantities are available in stock.
 * Throws AppError if any item is insufficient.
 */
export const checkAvailability = async (items: { inventoryId: string, quantity: number, itemName?: string }[]) => {
    for (const item of items) {
        const product = await Inventory.findById(item.inventoryId);
        if (!product) {
            throw new AppError(`Item ${item.itemName || item.inventoryId} not found in inventory`, 404);
        }
        if (product.availableQuantity < item.quantity) {
            throw new AppError(
                `Insufficient stock for ${product.itemName}. Available: ${product.availableQuantity}, Requested: ${item.quantity}`,
                400
            );
        }
    }
};

/**
 * Adjusts stock quantity (increment or decrement).
 * Use negative quantity for decrementing.
 */
export const adjustStock = async (itemId: string, quantityChange: number) => {
    const item = await Inventory.findById(itemId);
    if (!item) throw new AppError('Inventory item not found', 404);

    const newQuantity = item.availableQuantity + quantityChange;
    
    // Safety check for negative stock (though checkAvailability should prevent this for orders)
    if (newQuantity < 0) {
        throw new AppError(`Cannot reduce stock below zero for ${item.itemName}`, 400);
    }

    item.availableQuantity = newQuantity;
    await item.save();
    return item;
};

/**
 * Updates the pending price for an item (Proposed by Finance/Admin)
 */
export const updatePrice = async (id: string, pendingUnitPrice: number) => {
    const item = await Inventory.findByIdAndUpdate(
        id,
        {
            pendingUnitPrice,
            priceStatus: 'Pending',
        },
        { new: true, runValidators: true }
    );
    if (!item) throw new AppError('Inventory item not found', 404);
    return item;
};

/**
 * Confirms the pending price (Action by Admin)
 */
export const confirmPrice = async (id: string, confirmedBy: string) => {
    const item = await Inventory.findById(id);
    if (!item) throw new AppError('Inventory item not found', 404);

    item.unitPrice = item.pendingUnitPrice;
    item.priceStatus = 'Confirmed';
    item.priceConfirmedBy = confirmedBy as any;
    item.priceConfirmedAt = new Date();

    await item.save();
    return item;
};

/**
 * Adjusts stock quantity and updates the item cost
 * Used when confirming receipt of a Purchase Order
 */
export const receiveStockAndCost = async (itemId: string, quantityChange: number, unitCost: number) => {
    const item = await Inventory.findById(itemId);
    if (!item) throw new AppError('Inventory item not found', 404);

    const newQuantity = item.availableQuantity + quantityChange;
    
    if (newQuantity < 0) {
        throw new AppError(`Cannot reduce stock below zero for ${item.itemName}`, 400);
    }

    item.availableQuantity = newQuantity;
    if (unitCost > 0) {
        item.cost = unitCost;
    }
    
    await item.save();
    return item;
};


