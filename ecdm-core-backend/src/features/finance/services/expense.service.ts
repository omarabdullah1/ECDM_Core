import { Expense } from '../models/expense.model';
import { AppError } from '../../../utils/apiError';

export const create = async (data: any) => {
  return Expense.create(data);
};

/**
 * Intelligent upsert for automated expenses.
 * Prevents duplicates for internal records (like monthly salaries).
 */
export const upsertExpense = async (criteria: Record<string, any>, data: any) => {
  const existing = await Expense.findOne(criteria);
  if (existing) {
    return Expense.findByIdAndUpdate(existing._id, data, { new: true });
  }
  return Expense.create(data);
};

export const getAll = async (query: Record<string, unknown>) => {
  const { page = 1, limit = 1000 } = query;
  const skip = (Number(page) - 1) * Number(limit);
  
  const [data, total] = await Promise.all([
    Expense.find()
      .populate('employeeId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Expense.countDocuments(),
  ]);
  
  return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string) => {
  const expense = await Expense.findById(id).populate('employeeId', 'firstName lastName');
  if (!expense) throw new AppError('Expense not found', 404);
  return expense;
};

export const update = async (id: string, data: any) => {
  const expense = await Expense.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!expense) throw new AppError('Expense not found', 404);
  return expense;
};

export const remove = async (id: string) => {
  const expense = await Expense.findByIdAndDelete(id);
  if (!expense) throw new AppError('Expense not found', 404);
};