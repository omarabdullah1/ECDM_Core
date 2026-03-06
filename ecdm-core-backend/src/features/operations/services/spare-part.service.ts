import SparePart from '../models/spare-part.model';
import { AppError } from '../../../utils/apiError';
import { CreateSparePartInput, UpdateSparePartInput } from '../validation/spare-part.validation';
import { SparePartQueryParams } from '../types/spare-part.types';

/**
 * SparePart Service - Business Logic Layer
 * Handles CRUD operations for Spare Parts inventory
 */

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

export const create = async (data: CreateSparePartInput) => {
    return SparePart.create(data);
};

// ─────────────────────────────────────────────────────────────────────────────
// READ ALL (With Pagination & Filtering)
// ─────────────────────────────────────────────────────────────────────────────

export const getAll = async (query: SparePartQueryParams) => {
    const { page = 1, limit = 10, search, category } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const filter: Record<string, unknown> = {};
    
    // Filter by category
    if (category) {
        filter.category = category;
    }
    
    // Search by itemName or specification
    if (search) {
        filter.$or = [
            { itemName: { $regex: search, $options: 'i' } },
            { specification: { $regex: search, $options: 'i' } },
            { sparePartsId: { $regex: search, $options: 'i' } },
        ];
    }
    
    const [data, total] = await Promise.all([
        SparePart.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        SparePart.countDocuments(filter),
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

// ─────────────────────────────────────────────────────────────────────────────
// READ BY ID
// ─────────────────────────────────────────────────────────────────────────────

export const getById = async (id: string) => {
    const sparePart = await SparePart.findById(id);
    if (!sparePart) {
        throw new AppError('Spare part not found', 404);
    }
    return sparePart;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export const update = async (id: string, data: UpdateSparePartInput) => {
    const sparePart = await SparePart.findByIdAndUpdate(
        id,
        data,
        { new: true, runValidators: true }
    );
    
    if (!sparePart) {
        throw new AppError('Spare part not found', 404);
    }
    
    return sparePart;
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

export const remove = async (id: string) => {
    const sparePart = await SparePart.findByIdAndDelete(id);
    if (!sparePart) {
        throw new AppError('Spare part not found', 404);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// BULK DELETE (Admin-only)
// ─────────────────────────────────────────────────────────────────────────────

export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await SparePart.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL CATEGORIES (For Filter Dropdown)
// ─────────────────────────────────────────────────────────────────────────────

export const getAllCategories = async (): Promise<string[]> => {
    const categories = await SparePart.distinct('category');
    return categories.filter((c) => c && c.trim() !== '');
};
