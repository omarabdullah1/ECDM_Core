import { AppError } from '../../../utils/apiError';
import PriceList from '../models/price-list.model';
import { PriceListQueryParams } from '../types/price-list.types';
import { CreatePriceListInput, UpdatePriceListInput } from '../validation/price-list.validation';

/**
 * PriceList Service — Business Logic Layer
 */

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const create = async (data: CreatePriceListInput) => {
    return PriceList.create(data);
};

// ─── READ ALL ─────────────────────────────────────────────────────────────────

export const getAll = async (query: PriceListQueryParams) => {
    const { page = 1, limit = 10, search, category } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};

    if (category) {
        filter.category = category;
    }

    if (search) {
        filter.$or = [
            { itemName: { $regex: search, $options: 'i' } },
            { specification: { $regex: search, $options: 'i' } },
            { sparePartsId: { $regex: search, $options: 'i' } },
        ];
    }

    const [data, total] = await Promise.all([
        PriceList.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        PriceList.countDocuments(filter),
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
    const item = await PriceList.findById(id);
    if (!item) throw new AppError('Price list item not found', 404);
    return item;
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const update = async (id: string, data: UpdatePriceListInput) => {
    const item = await PriceList.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });
    if (!item) throw new AppError('Price list item not found', 404);
    return item;
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const remove = async (id: string) => {
    const item = await PriceList.findByIdAndDelete(id);
    if (!item) throw new AppError('Price list item not found', 404);
};

// ─── BULK DELETE ──────────────────────────────────────────────────────────────

export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await PriceList.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};
