import { Request, Response, NextFunction } from 'express';
import * as sheetService from '../services/google-sheets.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { sheetSyncSchema, sheetWebhookSchema } from '../validation/marketing-leads.validation';
import { AppError } from '../../../utils/apiError';

/**
 * POST /api/marketing/sync-sheet
 * Sync leads from Google Sheet to database with deduplication
 * - Uses phone as unique identifier
 * - Only forwards NEW leads to Sales pipeline
 */
export const syncSheet = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = sheetSyncSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError(parsed.error.errors[0]?.message || 'Validation error', 400);
        }

        const result = await sheetService.syncFromSheet(parsed.data);
        
        sendSuccess(res, {
            synced: result.synced,
            created: result.created,
            updated: result.updated,
            skipped: result.skipped,
            forwarded: result.forwarded,
            errors: result.errors,
        }, `Sync complete: ${result.created} new leads created and forwarded to Sales, ${result.updated} existing leads updated`);
    } catch (e) {
        next(e);
    }
};

/**
 * POST /api/marketing/sheet-webhook
 * Handle real-time updates from Google Apps Script with deduplication
 * - Uses phone as unique identifier
 * - Only forwards NEW leads to Sales pipeline
 */
export const sheetWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = sheetWebhookSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError(parsed.error.errors[0]?.message || 'Validation error', 400);
        }

        const result = await sheetService.handleSheetWebhook(parsed.data);
        
        sendSuccess(res, {
            lead: result.lead,
            isNew: result.isNew,
            forwardedToSales: result.forwardedToSales,
        }, result.isNew 
            ? 'New lead created and forwarded to Sales pipeline' 
            : 'Existing lead updated (not forwarded to Sales)');
    } catch (e) {
        next(e);
    }
};
