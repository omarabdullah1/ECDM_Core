import { Request, Response, NextFunction } from 'express';
import { analyzeExcelFile, commitLeads, AnalyzedLead } from '../services/import.service';
import { sendSuccess, sendError } from '../../../utils/apiResponse';

/**
 * POST /api/sales/data/import/analyze
 * 
 * Step 1 of the Excel Import process.
 * Accepts an uploaded .xlsx file, parses it, and categorizes rows into:
 * - newLeads: Valid rows ready for import
 * - skipped: Rows that already exist in the database
 * - errors: Rows missing mandatory fields
 */
export const analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            sendError(res, 'No file uploaded. Please upload an Excel file (.xlsx or .csv)', 400);
            return;
        }

        // Validate file type
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
        ];

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            sendError(res, 'Invalid file type. Please upload an Excel file (.xlsx) or CSV file', 400);
            return;
        }

        // Process the file
        const result = await analyzeExcelFile(req.file.buffer);

        sendSuccess(res, {
            summary: {
                newLeads: result.newLeads.length,
                skipped: result.skipped.length,
                errors: result.errors.length,
            },
            newLeads: result.newLeads,
            skipped: result.skipped,
            errors: result.errors,
        }, 'File analysis complete');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/sales/data/import/commit
 * 
 * Step 2 of the Excel Import process.
 * Accepts the approved newLeads array and creates Customer/SalesData records.
 */
export const commit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { newLeads } = req.body as { newLeads: AnalyzedLead[] };

        if (!newLeads || !Array.isArray(newLeads)) {
            sendError(res, 'Missing or invalid newLeads array', 400);
            return;
        }

        const result = await commitLeads(newLeads);

        sendSuccess(res, result, 'Import committed successfully');
    } catch (error) {
        next(error);
    }
};

