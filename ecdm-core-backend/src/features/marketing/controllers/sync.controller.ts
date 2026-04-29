import { Request, Response, NextFunction } from 'express';
import { analyzeSheet, commitSync, CommitInput } from '../services/sync.service';
import MarketingLead from '../models/marketing-lead.model';
import { sendSuccess, sendError } from '../../../utils/apiResponse';

/**
 * POST /api/marketing/sync/analyze
 * 
 * Step 1 of the 2-step sync process.
 * Analyzes Google Sheet data and categorizes into: new, exactMatch, conflicts.
 */
export const analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { spreadsheetId, sheetRange, serviceAccountJson } = req.body;

        if (!spreadsheetId || !sheetRange || !serviceAccountJson) {
            sendError(res, 'Missing required fields: spreadsheetId, sheetRange, serviceAccountJson', 400);
            return;
        }

        const result = await analyzeSheet({
            spreadsheetId,
            sheetRange,
            serviceAccountJson,
        });

        sendSuccess(res, {
            summary: {
                new: result.new.length,
                exactMatch: result.exactMatch.length,
                conflicts: result.conflicts.length,
            },
            new: result.new,
            exactMatch: result.exactMatch,
            conflicts: result.conflicts,
        }, 'Sheet analysis complete');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/marketing/sync/commit
 * 
 * Step 2 of the 2-step sync process.
 * Commits approved new leads and conflict resolutions.
 */
export const commit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { serviceAccountJson, newLeads, conflictResolutions } = req.body as CommitInput;

        if (!serviceAccountJson) {
            sendError(res, 'Missing required field: serviceAccountJson', 400);
            return;
        }

        const result = await commitSync({
            serviceAccountJson,
            newLeads: newLeads || [],
            conflictResolutions: conflictResolutions || [],
        });

        sendSuccess(res, result, 'Sync committed successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/marketing/bulk-delete
 * 
 * Deletes multiple marketing leads by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendError(res, 'Missing or invalid ids array', 400);
            return;
        }

        const result = await MarketingLead.deleteMany({ _id: { $in: ids } });

        sendSuccess(res, { 
            deletedCount: result.deletedCount,
        }, `Successfully deleted ${result.deletedCount} leads`);
    } catch (error) {
        next(error);
    }
};

