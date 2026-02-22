import Category from './category.model';
import { CreateCategoryInput, UpdateCategoryInput } from './category.validation';
import { ICategoryDocument } from './category.types';
import { AppError } from '../../../utils/apiError';

export const createCategory = async (data: CreateCategoryInput): Promise<ICategoryDocument> => {
    return Category.create(data);
};

export const getAllCategories = async (
    query: Record<string, unknown>,
    skip: number,
    limit: number,
): Promise<{ categories: ICategoryDocument[]; total: number }> => {
    const filter: Record<string, unknown> = {};
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
    if (query.search) filter.$text = { $search: query.search as string };

    const [categories, total] = await Promise.all([
        Category.find(filter)
            .populate('parentCategory', 'name')
            .skip(skip)
            .limit(limit)
            .sort({ name: 1 }),
        Category.countDocuments(filter),
    ]);
    return { categories, total };
};

export const getCategoryById = async (id: string): Promise<ICategoryDocument> => {
    const cat = await Category.findById(id).populate('parentCategory', 'name');
    if (!cat) throw new AppError('Category not found', 404);
    return cat;
};

export const updateCategory = async (id: string, data: UpdateCategoryInput): Promise<ICategoryDocument> => {
    const cat = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('parentCategory', 'name');
    if (!cat) throw new AppError('Category not found', 404);
    return cat;
};

export const deleteCategory = async (id: string): Promise<void> => {
    const cat = await Category.findByIdAndDelete(id);
    if (!cat) throw new AppError('Category not found', 404);
};
