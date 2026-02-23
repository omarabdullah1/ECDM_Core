import InventoryItem from './inventory-item.model';
import { AppError } from '../../../utils/apiError';
import { CreateInventoryItemInput, UpdateInventoryItemInput } from './inventory-item.validation';

export const create = async (data: CreateInventoryItemInput) => InventoryItem.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, status, category, search } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (search)   filter.itemName = { $regex: search, $options: 'i' };

    const [data, total] = await Promise.all([
        InventoryItem.find(filter)
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        InventoryItem.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };
};

export const getById = async (id: string) => {
    const item = await InventoryItem.findById(id).populate('category', 'name');
    if (!item) throw new AppError('Inventory item not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateInventoryItemInput) => {
    const item = await InventoryItem.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Inventory item not found', 404);
    return item;
};

export const deleteInventoryItem = async (id: string) => {
    const item = await InventoryItem.findByIdAndDelete(id);
    if (!item) throw new AppError('Inventory item not found', 404);
};
