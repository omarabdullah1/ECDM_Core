import { Request, Response, NextFunction } from 'express';
import Campaign from '../models/campaign.model';
import { sendSuccess } from '../../../utils/apiResponse';
import { AppError } from '../../../utils/apiError';

/**
 * Campaign Controller - HTTP Request Handlers
 * Handles file uploads via multer middleware (multipart/form-data)
 */

// ─────────────────────────────────────────────────────────────────────────────
// CREATE (POST /api/marketing/campaigns)
// ─────────────────────────────────────────────────────────────────────────────

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎯 CAMPAIGN CREATE REQUEST');
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
        
        const campaign = await Campaign.create(req.body);
        
        console.log('✅ Campaign created successfully:', campaign.campaignId);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        sendSuccess(res, { campaign }, 'Campaign created', 201);
    } catch (e) {
        console.error('❌ CAMPAIGN CREATE ERROR:', e);
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL (GET /api/marketing/campaigns)
// ─────────────────────────────────────────────────────────────────────────────

export const getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const campaigns = await Campaign.find().sort({ createdAt: -1 });
        sendSuccess(res, { campaigns, total: campaigns.length });
    } catch (e) {
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID (GET /api/marketing/campaigns/:id)
// ─────────────────────────────────────────────────────────────────────────────

export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            throw new AppError('Campaign not found', 404);
        }
        sendSuccess(res, { campaign });
    } catch (e) {
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE (PATCH/PUT /api/marketing/campaigns/:id)
// Supports multipart/form-data for file upload
// ─────────────────────────────────────────────────────────────────────────────

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 CAMPAIGN UPDATE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Campaign ID:', req.params.id);
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
        
        const campaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!campaign) {
            throw new AppError('Campaign not found', 404);
        }
        
        console.log('✅ Campaign updated successfully:', campaign.campaignId);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        sendSuccess(res, { campaign }, 'Campaign updated');
    } catch (e) {
        console.error('❌ CAMPAIGN UPDATE ERROR:', e);
        next(e);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE (DELETE /api/marketing/campaigns/:id)
// ─────────────────────────────────────────────────────────────────────────────

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id);
        if (!campaign) {
            throw new AppError('Campaign not found', 404);
        }
        sendSuccess(res, { campaign }, 'Campaign deleted');
    } catch (e) {
        next(e);
    }
};
