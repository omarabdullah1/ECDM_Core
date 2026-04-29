import { Request, Response, NextFunction } from 'express';
import SheetConnection from '../models/sheet-connection.model';
import { sendSuccess, sendError } from '../../../utils/apiResponse';

/**
 * GET /api/marketing/saved-sheets
 * 
 * Returns all saved sheet connections (excluding raw JSON for security)
 */
export const getSavedConnections = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const connections = await SheetConnection.find()
            .select('-serviceAccountJson') // Exclude the raw JSON for security
            .sort({ lastUsedAt: -1, createdAt: -1 })
            .lean();

        sendSuccess(res, connections, 'Saved connections retrieved');
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/marketing/saved-sheets/:id
 * 
 * Returns a single saved connection including the JSON (for sync use)
 */
export const getSavedConnectionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const connection = await SheetConnection.findById(id).lean();

        if (!connection) {
            sendError(res, 'Connection not found', 404);
            return;
        }

        // Update lastUsedAt
        await SheetConnection.findByIdAndUpdate(id, { lastUsedAt: new Date() });

        sendSuccess(res, connection, 'Connection retrieved');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/marketing/saved-sheets
 * 
 * Saves a new sheet connection configuration
 */
export const createSavedConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { connectionName, spreadsheetId, sheetRange, serviceAccountJson } = req.body;

        if (!connectionName || !spreadsheetId || !sheetRange || !serviceAccountJson) {
            sendError(res, 'Missing required fields: connectionName, spreadsheetId, sheetRange, serviceAccountJson', 400);
            return;
        }

        // Validate JSON format
        try {
            JSON.parse(serviceAccountJson);
        } catch {
            sendError(res, 'Invalid service account JSON format', 400);
            return;
        }

        const connection = await SheetConnection.create({
            connectionName,
            spreadsheetId,
            sheetRange,
            serviceAccountJson,
            createdBy: req.user?.userId,
        });

        // Return without the raw JSON
        const result = {
            _id: connection._id,
            connectionName: connection.connectionName,
            spreadsheetId: connection.spreadsheetId,
            sheetRange: connection.sheetRange,
            createdAt: connection.createdAt,
        };

        sendSuccess(res, result, 'Connection saved successfully', 201);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/marketing/saved-sheets/:id
 * 
 * Deletes a saved sheet connection
 */
export const deleteSavedConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const connection = await SheetConnection.findByIdAndDelete(id);

        if (!connection) {
            sendError(res, 'Connection not found', 404);
            return;
        }

        sendSuccess(res, null, 'Connection deleted successfully');
    } catch (error) {
        next(error);
    }
};

