import Product from './product.model';
import { CreateProductInput, UpdateProductInput } from './product.validation';
import { IProductDocument } from './product.types';
import { AppError } from '../../../utils/apiError';

export const createProduct = async (data: CreateProductInput): Promise<IProductDocument> => {
    return Product.create(data);
};

export const getAllProducts = async (
    query: Record<string, unknown>,
    skip: number,
    limit: number,
): Promise<{ products: IProductDocument[]; total: number }> => {
    const filter: Record<string, unknown> = {};
    if (query.category) filter.category = query.category;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
    if (query.search) filter.$text = { $search: query.search as string };
    if (query.lowStock === 'true') {
        filter.$expr = { $lte: ['$currentStock', '$lowStockThreshold'] };
    }

    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('category', 'name')
            .skip(skip)
            .limit(limit)
            .sort({ name: 1 }),
        Product.countDocuments(filter),
    ]);
    return { products, total };
};

export const getProductById = async (id: string): Promise<IProductDocument> => {
    const product = await Product.findById(id).populate('category', 'name');
    if (!product) throw new AppError('Product not found', 404);
    return product;
};

export const updateProduct = async (id: string, data: UpdateProductInput): Promise<IProductDocument> => {
    const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('category', 'name');
    if (!product) throw new AppError('Product not found', 404);
    return product;
};

export const deleteProduct = async (id: string): Promise<void> => {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new AppError('Product not found', 404);
};

export const getLowStockCount = async (): Promise<number> => {
    return Product.countDocuments({ $expr: { $lte: ['$currentStock', '$lowStockThreshold'] }, isActive: true });
};
