import { Request, Response, NextFunction } from 'express';
import Campaign from '../models/campaign.model';
import { sendSuccess } from '../../../utils/apiResponse';
import { AppError } from '../../../utils/apiError';
import * as campaignSyncService from '../services/campaign-sync.service';

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

// ─────────────────────────────────────────────────────────────────────────────
// SYNC FROM GOOGLE SHEETS (POST /api/marketing/campaigns/sync)
// ─────────────────────────────────────────────────────────────────────────────

export const syncFromSheet = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔄 CAMPAIGN SYNC FROM GOOGLE SHEETS - ROUTE HIT');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Request method:', req.method);
        console.log('Request path:', req.path);
        console.log('Request headers:', JSON.stringify(req.headers, null, 2));
        console.log('Request body keys:', Object.keys(req.body));

        const { spreadsheetId, sheetRange, serviceAccountJson } = req.body;

        console.log('📋 Field validation:');
        console.log('  - spreadsheetId:', spreadsheetId ? '✓ Present' : '✗ Missing');
        console.log('  - sheetRange:', sheetRange ? '✓ Present' : '✗ Missing');
        console.log('  - serviceAccountJson:', serviceAccountJson ? `✓ Present (${serviceAccountJson.length} chars)` : '✗ Missing');

        if (!spreadsheetId || !sheetRange || !serviceAccountJson) {
            console.error('❌ Validation failed - missing required fields');
            throw new AppError('Missing required fields: spreadsheetId, sheetRange, serviceAccountJson', 400);
        }

        console.log('✅ Validation passed, calling sync service...');

        const result = await campaignSyncService.syncCampaignsFromSheet({
            spreadsheetId,
            sheetRange,
            serviceAccountJson,
        });

        console.log('✅ Sync completed:');
        console.log('  - Created:', result.created);
        console.log('  - Updated:', result.updated);
        console.log('  - Total synced:', result.synced);
        if (result.errors.length > 0) {
            console.log('  - Errors:', result.errors.length);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        sendSuccess(
            res,
            {
                synced: result.synced,
                created: result.created,
                updated: result.updated,
                errors: result.errors,
            },
            `Successfully synced ${result.synced} campaigns from Google Sheets (${result.created} created, ${result.updated} updated)`
        );
    } catch (e) {
        console.error('❌ CAMPAIGN SYNC ERROR:', e);
        next(e);
    }
};
