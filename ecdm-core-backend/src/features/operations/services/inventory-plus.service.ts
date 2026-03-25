import mongoose from 'mongoose';
import InventoryItem from '../models/inventory-item.model';
import Category from '../models/category.model';
import Product from '../models/product.model';
import StockMovement from '../models/stock-movement.model';
import { AppError } from '../../../utils/apiError';
import {
    CreateInventoryItemInput, UpdateInventoryItemInput,
    CreateCategoryInput, UpdateCategoryInput,
    CreateProductInput, UpdateProductInput,
    CreateStockMovementInput,
} from '../validation/inventory-plus.validation';

// ── InventoryItem ─────────────────────────────────────────────────────────────
export const createItem = async (data: CreateInventoryItemInput) => InventoryItem.create(data);

export const getAllItems = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, status, category, search } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: Record<string, unknown> = {};
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (search)   filter.itemName = { $regex: search, $options: 'i' };

    const [data, total] = await Promise.all([
        InventoryItem.find(filter).populate('category', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        InventoryItem.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getItemById = async (id: string) => {
    const item = await InventoryItem.findById(id).populate('category', 'name');
    if (!item) throw new AppError('Inventory item not found', 404);
    return item;
};

export const updateItem = async (id: string, data: UpdateInventoryItemInput) => {
    const item = await InventoryItem.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Inventory item not found', 404);
    return item;
};

export const deleteItem = async (id: string) => {
    const item = await InventoryItem.findByIdAndDelete(id);
    if (!item) throw new AppError('Inventory item not found', 404);
};

/**
 * Bulk delete multiple inventory items by IDs.
 * Admin-only operation.
 */
export const bulkDeleteItems = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await InventoryItem.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

// ── Category ──────────────────────────────────────────────────────────────────
export const createCategory = async (data: CreateCategoryInput) => Category.create(data);

export const getAllCategories = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.name = { $regex: search, $options: 'i' };

    const [data, total] = await Promise.all([
        Category.find(filter).populate('parentCategory', 'name').sort({ name: 1 }).skip(skip).limit(Number(limit)),
        Category.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getCategoryById = async (id: string) => {
    const item = await Category.findById(id).populate('parentCategory', 'name');
    if (!item) throw new AppError('Category not found', 404);
    return item;
};

export const updateCategory = async (id: string, data: UpdateCategoryInput) => {
    const item = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Category not found', 404);
    return item;
};

export const deleteCategory = async (id: string) => {
    const item = await Category.findByIdAndDelete(id);
    if (!item) throw new AppError('Category not found', 404);
};

/**
 * Bulk delete multiple categories by IDs.
 * Admin-only operation.
 */
export const bulkDeleteCategories = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await Category.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

// ── Product ───────────────────────────────────────────────────────────────────
export const createProduct = async (data: CreateProductInput) => Product.create(data);

export const getAllProducts = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, category, search, isActive } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: Record<string, unknown> = {};
    if (category)           filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.$text = { $search: String(search) };

    const [data, total] = await Promise.all([
        Product.find(filter).populate('category', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Product.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getProductById = async (id: string) => {
    const item = await Product.findById(id).populate('category', 'name');
    if (!item) throw new AppError('Product not found', 404);
    return item;
};

export const updateProduct = async (id: string, data: UpdateProductInput) => {
    const item = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Product not found', 404);
    return item;
};

export const deleteProduct = async (id: string) => {
    const item = await Product.findByIdAndDelete(id);
    if (!item) throw new AppError('Product not found', 404);
};

/**
 * Bulk delete multiple products by IDs.
 * Admin-only operation.
 */
export const bulkDeleteProducts = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await Product.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

// ── StockMovement ─────────────────────────────────────────────────────────────
export const createStockMovement = async (data: CreateStockMovementInput) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const delta = data.type === 'IN' ? data.quantity : data.type === 'OUT' ? -data.quantity : 0;
        
        if (delta !== 0) {
            const product = await Product.findById(data.product).session(session);
            if (!product) {
                throw new AppError('Product not found', 404);
            }
            
            if (delta < 0 && product.currentStock + delta < 0) {
                throw new AppError(`Insufficient stock. Available: ${product.currentStock}, requested: ${Math.abs(delta)}`, 400);
            }
            
            await Product.findByIdAndUpdate(data.product, { $inc: { currentStock: delta } }, { session });
        }
        
        const movement = await StockMovement.create([data], { session });
        await session.commitTransaction();
        
        return movement[0].populate({ path: 'product', select: 'sku name' });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const getAllStockMovements = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, product, type, search, startDate, endDate } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: Record<string, unknown> = {};
    
    if (product) filter.product = product;
    if (type)    filter.type    = type;
    
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) (filter.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
        if (endDate) (filter.createdAt as Record<string, Date>).$lte = new Date(endDate as string);
    }
    
    if (search) {
        const searchRegex = { $regex: search, $options: 'i' };
        filter.$or = [
            { reason: searchRegex },
            { reference: searchRegex },
            { 'product.name': searchRegex },
            { 'product.sku': searchRegex },
        ];
    }

    const [data, total] = await Promise.all([
        StockMovement.find(filter)
            .populate('product', 'sku name')
            .populate('performedBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        StockMovement.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getStockMovementById = async (id: string) => {
    const item = await StockMovement.findById(id)
        .populate('product', 'sku name')
        .populate('performedBy', 'firstName lastName');
    if (!item) throw new AppError('Stock movement not found', 404);
    return item;
};
