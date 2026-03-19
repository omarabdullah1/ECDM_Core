import { InventoryFinance } from '../models/inventory-finance.model';
import { AppError } from '../../../utils/apiError';

export const create = async (data: any) => {
  return InventoryFinance.create(data);
};

export const getAll = async (query: Record<string, unknown>) => {
  const { page = 1, limit = 1000 } = query;
  const skip = (Number(page) - 1) * Number(limit);
  
  const [data, total] = await Promise.all([
    InventoryFinance.find().skip(skip).limit(Number(limit)),
    InventoryFinance.countDocuments(),
  ]);
  
  return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string) => {
  const inventory = await InventoryFinance.findById(id);
  if (!inventory) throw new AppError('Inventory finance record not found', 404);
  return inventory;
};

export const update = async (id: string, data: any) => {
  const inventory = await InventoryFinance.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!inventory) throw new AppError('Inventory finance record not found', 404);
  return inventory;
};

export const remove = async (id: string) => {
  const inventory = await InventoryFinance.findByIdAndDelete(id);
  if (!inventory) throw new AppError('Inventory finance record not found', 404);
};