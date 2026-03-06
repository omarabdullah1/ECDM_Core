import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/spare-part.service';
import { sendSuccess } from '../../../utils/apiResponse';

/**
 * SparePart Controller - HTTP Request Handlers
 * Handles file uploads via multer middleware (multipart/form-data)
 */

// ─────────────────────────────────────────────────────────────────────────────
// CREATE (POST /api/operations/spare-parts)
// ─────────────────────────────────────────────────────────────────────────────

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📦 SPARE PART CREATE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Has File Upload:', !!req.file);
        
        if (req.file) {
            console.log('📎 File Details:');
            console.log('  - Original Name:', req.file.originalname);
            console.log('  - Saved As:', req.file.filename);
            console.log('  - Size:', `${(req.file.size / 1024).toFixed(2)} KB`);
            console.log('  - Type:', req.file.mimetype);
            console.log('  - URL:', req.body.dataSheetUrl);
        }
        
        console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
        
        const sparePart = await svc.create(req.body);
        
        console.log('✅ Spare part created successfully:', sparePart.sparePartsId);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        sendSuccess(res, { sparePart }, 'Spare part created', 201);
    } catch (e) {
        console.error('❌ SPARE PART CREATE ERROR:', e);
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL (GET /api/operations/spare-parts)
// ─────────────────────────────────────────────────────────────────────────────

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getAll(req.query as Record<string, unknown>));
    } catch (e) {
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID (GET /api/operations/spare-parts/:id)
// ─────────────────────────────────────────────────────────────────────────────

export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { sparePart: await svc.getById(String(req.params.id)) });
    } catch (e) {
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE (PATCH/PUT /api/operations/spare-parts/:id)
// Supports multipart/form-data for file upload
// ─────────────────────────────────────────────────────────────────────────────

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 SPARE PART UPDATE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Spare Part ID:', req.params.id);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Has File Upload:', !!req.file);
        
        if (req.file) {
            console.log('📎 File Details:');
            console.log('  - Original Name:', req.file.originalname);
            console.log('  - Saved As:', req.file.filename);
            console.log('  - Size:', `${(req.file.size / 1024).toFixed(2)} KB`);
            console.log('  - Type:', req.file.mimetype);
            console.log('  - URL:', req.body.dataSheetUrl);
        }
        
        console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
        
        const sparePart = await svc.update(String(req.params.id), req.body);
        
        console.log('✅ Spare part updated successfully');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        sendSuccess(res, { sparePart }, 'Spare part updated');
    } catch (e) {
        console.error('❌ SPARE PART UPDATE ERROR:', e);
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE (DELETE /api/operations/spare-parts/:id)
// ─────────────────────────────────────────────────────────────────────────────

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.remove(String(req.params.id));
        sendSuccess(res, null, 'Spare part deleted');
    } catch (e) {
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// BULK DELETE (POST /api/operations/spare-parts/bulk-delete)
// Admin-only operation
// ─────────────────────────────────────────────────────────────────────────────

export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        
        const result = await svc.bulkDelete(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} spare parts`);
    } catch (e) {
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET CATEGORIES (GET /api/operations/spare-parts/categories)
// For filter dropdown
// ─────────────────────────────────────────────────────────────────────────────

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await svc.getAllCategories();
        sendSuccess(res, { categories });
    } catch (e) {
        next(e);
    }
};
