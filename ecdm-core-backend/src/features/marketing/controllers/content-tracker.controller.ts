import { Request, Response, NextFunction } from 'express';
import ContentTracker from '../models/content-tracker.model';
import { sendSuccess } from '../../../utils/apiResponse';
import { AppError } from '../../../utils/apiError';

/**
 * ContentTracker Controller - HTTP Request Handlers
 * Handles file uploads via multer middleware (multipart/form-data)
 */

// ─────────────────────────────────────────────────────────────────────────────
// CREATE (POST /api/marketing/content)
// ─────────────────────────────────────────────────────────────────────────────

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 CONTENT TRACKER CREATE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Has File Upload:', !!req.file);
        
        if (req.file) {
            console.log('📎 File Details:');
            console.log('  - Original Name:', req.file.originalname);
            console.log('  - Saved As:', req.file.filename);
            console.log('  - Size:', `${(req.file.size / 1024).toFixed(2)} KB`);
            console.log('  - Type:', req.file.mimetype);
            console.log('  - URL:', req.body.fileUrl);
        }
        
        console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
        
        const content = await ContentTracker.create(req.body);
        
        console.log('✅ Content tracker created successfully:', content.contentId);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        sendSuccess(res, { content }, 'Content tracker created', 201);
    } catch (e) {
        console.error('❌ CONTENT TRACKER CREATE ERROR:', e);
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL (GET /api/marketing/content)
// ─────────────────────────────────────────────────────────────────────────────

export const getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const contents = await ContentTracker.find().sort({ createdAt: -1 });
        sendSuccess(res, { contents, total: contents.length });
    } catch (e) {
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID (GET /api/marketing/content/:id)
// ─────────────────────────────────────────────────────────────────────────────

export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const content = await ContentTracker.findById(req.params.id);
        if (!content) {
            throw new AppError('Content tracker not found', 404);
        }
        sendSuccess(res, { content });
    } catch (e) {
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE (PATCH/PUT /api/marketing/content/:id)
// Supports multipart/form-data for file upload
// ─────────────────────────────────────────────────────────────────────────────

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 CONTENT TRACKER UPDATE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Content ID:', req.params.id);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Has File Upload:', !!req.file);
        
        if (req.file) {
            console.log('📎 File Details:');
            console.log('  - Original Name:', req.file.originalname);
            console.log('  - Saved As:', req.file.filename);
            console.log('  - Size:', `${(req.file.size / 1024).toFixed(2)} KB`);
            console.log('  - Type:', req.file.mimetype);
            console.log('  - URL:', req.body.fileUrl);
        }
        
        console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
        
        const content = await ContentTracker.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!content) {
            throw new AppError('Content tracker not found', 404);
        }
        
        console.log('✅ Content tracker updated successfully:', content.contentId);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        sendSuccess(res, { content }, 'Content tracker updated');
    } catch (e) {
        console.error('❌ CONTENT TRACKER UPDATE ERROR:', e);
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE (DELETE /api/marketing/content/:id)
// ─────────────────────────────────────────────────────────────────────────────

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const content = await ContentTracker.findByIdAndDelete(req.params.id);
        if (!content) {
            throw new AppError('Content tracker not found', 404);
        }
        sendSuccess(res, { content }, 'Content tracker deleted');
    } catch (e) {
        next(e);
    }
};

