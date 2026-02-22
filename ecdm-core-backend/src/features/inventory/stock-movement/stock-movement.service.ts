import StockMovement from './stock-movement.model';
import Product from '../product/product.model';
import { CreateStockMovementInput } from './stock-movement.validation';
import { IStockMovementDocument, MovementType } from './stock-movement.types';
import { AppError } from '../../../utils/apiError';

const populateFields = [
    { path: 'product', select: 'sku name currentStock unit' },
    { path: 'performedBy', select: 'firstName lastName email' },
];

export const createStockMovement = async (
    data: CreateStockMovementInput,
    performedBy: string,
): Promise<IStockMovementDocument> => {
    // Validate product exists
    const product = await Product.findById(data.product);
    if (!product) throw new AppError('Product not found', 404);

    // Prevent stock going negative on Out movement
    if (data.type === MovementType.Out && product.currentStock < data.quantity) {
        throw new AppError(`Insufficient stock. Available: ${product.currentStock}`, 400);
    }

    // Create the movement record
    const movement = await StockMovement.create({ ...data, performedBy });

    // Auto-update product stock
    if (data.type === MovementType.In) {
        product.currentStock += data.quantity;
    } else if (data.type === MovementType.Out) {
        product.currentStock -= data.quantity;
    } else if (data.type === MovementType.Adjustment) {
        product.currentStock = data.quantity; // absolute set
    }
    await product.save();

    return movement.populate(populateFields);
};

export const getAllStockMovements = async (
    query: Record<string, unknown>,
    skip: number,
    limit: number,
): Promise<{ movements: IStockMovementDocument[]; total: number }> => {
    const filter: Record<string, unknown> = {};
    if (query.product) filter.product = query.product;
    if (query.type) filter.type = query.type;

    const [movements, total] = await Promise.all([
        StockMovement.find(filter)
            .populate(populateFields)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }),
        StockMovement.countDocuments(filter),
    ]);
    return { movements, total };
};

export const getStockMovementById = async (id: string): Promise<IStockMovementDocument> => {
    const movement = await StockMovement.findById(id).populate(populateFields);
    if (!movement) throw new AppError('Stock movement not found', 404);
    return movement;
};

export const deleteStockMovement = async (id: string): Promise<void> => {
    const movement = await StockMovement.findByIdAndDelete(id);
    if (!movement) throw new AppError('Stock movement not found', 404);
    // Note: does NOT reverse the stock change — admin responsibility
};
