import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/inventory-plus.service';
import { sendSuccess } from '../../../utils/apiResponse';

// ── InventoryItem ─────────────────────────────────────────────────────────────
export const createItem = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.createItem(req.body) }, 'Inventory item created', 201); }
    catch (e) { next(e); }
};
export const getAllItems = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.getAllItems(req.query as Record<string, unknown>)); }
    catch (e) { next(e); }
};
export const getItemById = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.getItemById(String(req.params.id)) }); }
    catch (e) { next(e); }
};
export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.updateItem(String(req.params.id), req.body) }, 'Inventory item updated'); }
    catch (e) { next(e); }
};
export const removeItem = async (req: Request, res: Response, next: NextFunction) => {
    try { await svc.deleteItem(String(req.params.id)); sendSuccess(res, null, 'Inventory item deleted'); }
    catch (e) { next(e); }
};

// ── Category ──────────────────────────────────────────────────────────────────
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.createCategory(req.body) }, 'Category created', 201); }
    catch (e) { next(e); }
};
export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.getAllCategories(req.query as Record<string, unknown>)); }
    catch (e) { next(e); }
};
export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.getCategoryById(String(req.params.id)) }); }
    catch (e) { next(e); }
};
export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.updateCategory(String(req.params.id), req.body) }, 'Category updated'); }
    catch (e) { next(e); }
};
export const removeCategory = async (req: Request, res: Response, next: NextFunction) => {
    try { await svc.deleteCategory(String(req.params.id)); sendSuccess(res, null, 'Category deleted'); }
    catch (e) { next(e); }
};

// ── Product ───────────────────────────────────────────────────────────────────
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.createProduct(req.body) }, 'Product created', 201); }
    catch (e) { next(e); }
};
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.getAllProducts(req.query as Record<string, unknown>)); }
    catch (e) { next(e); }
};
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.getProductById(String(req.params.id)) }); }
    catch (e) { next(e); }
};
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.updateProduct(String(req.params.id), req.body) }, 'Product updated'); }
    catch (e) { next(e); }
};
export const removeProduct = async (req: Request, res: Response, next: NextFunction) => {
    try { await svc.deleteProduct(String(req.params.id)); sendSuccess(res, null, 'Product deleted'); }
    catch (e) { next(e); }
};

// ── StockMovement ─────────────────────────────────────────────────────────────
export const createStockMovement = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.createStockMovement(req.body) }, 'Stock movement recorded', 201); }
    catch (e) { next(e); }
};
export const getAllStockMovements = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.getAllStockMovements(req.query as Record<string, unknown>)); }
    catch (e) { next(e); }
};
export const getStockMovementById = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.getStockMovementById(String(req.params.id)) }); }
    catch (e) { next(e); }
};

// ── Bulk Delete Operations (Admin-only) ───────────────────────────────────────
export const bulkDeleteItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        const result = await svc.bulkDeleteItems(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} inventory items`);
    } catch (e) { next(e); }
};

export const bulkDeleteCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        const result = await svc.bulkDeleteCategories(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} categories`);
    } catch (e) { next(e); }
};

export const bulkDeleteProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        const result = await svc.bulkDeleteProducts(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} products`);
    } catch (e) { next(e); }
};
