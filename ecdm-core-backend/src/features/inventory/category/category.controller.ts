import { Request, Response, NextFunction } from 'express';
import * as service from './category.service';

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cat = await service.createCategory(req.body);
        res.status(201).json({ success: true, data: cat, message: 'Category created' });
    } catch (err) { next(err); }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;
        const { categories, total } = await service.getAllCategories(req.query, skip, limit);
        res.json({ success: true, data: { data: categories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, message: 'OK' });
    } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cat = await service.getCategoryById(req.params.id);
        res.json({ success: true, data: cat, message: 'OK' });
    } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cat = await service.updateCategory(req.params.id, req.body);
        res.json({ success: true, data: cat, message: 'Category updated' });
    } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await service.deleteCategory(req.params.id);
        res.json({ success: true, data: null, message: 'Category deleted' });
    } catch (err) { next(err); }
};
