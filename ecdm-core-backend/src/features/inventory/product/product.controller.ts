import { Request, Response, NextFunction } from 'express';
import * as service from './product.service';

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const product = await service.createProduct(req.body);
        res.status(201).json({ success: true, data: product, message: 'Product created' });
    } catch (err) { next(err); }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const { products, total } = await service.getAllProducts(req.query, skip, limit);
        res.json({ success: true, data: { data: products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, message: 'OK' });
    } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const product = await service.getProductById(req.params.id);
        res.json({ success: true, data: product, message: 'OK' });
    } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const product = await service.updateProduct(req.params.id, req.body);
        res.json({ success: true, data: product, message: 'Product updated' });
    } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await service.deleteProduct(req.params.id);
        res.json({ success: true, data: null, message: 'Product deleted' });
    } catch (err) { next(err); }
};
