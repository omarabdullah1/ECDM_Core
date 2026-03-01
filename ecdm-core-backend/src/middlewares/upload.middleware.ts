/**
 * File Upload Middleware using Multer
 * CEO-Approved Architecture for handling quotation file uploads
 * 
 * Storage: Local filesystem (can be migrated to cloud storage later)
 * Allowed Types: PDF, DOC, DOCX
 * Max File Size: 5MB
 * 
 * INSTALLATION REQUIRED:
 * Run the following commands before using this middleware:
 *   npm install multer
 *   npm install --save-dev @types/multer
 * 
 * OR use the provided batch file:
 *   Windows: install-multer.bat
 *   Linux/Mac: ./install-multer.sh
 */

import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Conditional import - will work after multer is installed
let multer: any;

try {
    const multerModule = require('multer');
    multer = multerModule.default || multerModule;
} catch (error) {
    console.warn('⚠️  Multer not installed. Run: npm install multer @types/multer');
    // Provide no-op exports if multer is not installed
    multer = () => {
        throw new Error('Multer is not installed. Run: npm install multer @types/multer');
    };
}

// Extend Express Request type to include Multer file property
declare global {
    namespace Express {
        interface Request {
            file?: {
                fieldname: string;
                originalname: string;
                encoding: string;
                mimetype: string;
                destination: string;
                filename: string;
                path: string;
                size: number;
                buffer: Buffer; // For memory storage
            };
        }
    }
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/quotations');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer Storage (will work after installation)
const storage = multer?.diskStorage ? multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
        cb(null, uploadsDir);
    },
    filename: (_req: any, file: any, cb: any) => {
        // Generate unique filename: quotation-{timestamp}-{random}.ext
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `quotation-${uniqueSuffix}${ext}`);
    }
}) : undefined;

// File Filter - Only allow PDF, DOC, DOCX
const fileFilter = (_req: any, file: any, cb: any) => {
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExts = ['.pdf', '.doc', '.docx'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
};

// Multer Upload Configuration
export const uploadQuotation = multer && storage ? multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
}) : {
    single: () => (_req: Request, _res: Response, next: NextFunction) => {
        console.error('❌ Multer not configured. Install multer package.');
        next(new Error('File upload not configured'));
    }
};

/**
 * Middleware to handle optional file upload
 * Attaches file URL to req.body.quotationFileUrl if file is uploaded
 * Also attaches the original filename to req.body.quotationFileName
 * 
 * Path Normalization:
 * - Strips Windows backslashes
 * - Removes 'public/' prefix if present
 * - Ensures path starts with '/'
 */
export const handleQuotationUpload = (req: Request, _res: Response, next: NextFunction): void => {
    if (req.file) {
        // Generate base path from filename
        let dbPath = `/uploads/quotations/${req.file.filename}`;
        
        // Normalize Windows backslashes to forward slashes
        dbPath = dbPath.replace(/\\/g, '/');
        
        // Strip 'public/' prefix if it exists (common misconfiguration)
        dbPath = dbPath.replace(/^\/public\//, '/').replace(/^public\//, '/');
        
        // Ensure path starts with exactly one forward slash
        if (!dbPath.startsWith('/')) {
            dbPath = '/' + dbPath;
        }
        
        // Double-slash cleanup
        dbPath = dbPath.replace(/\/+/g, '/');
        
        console.log('📎 Normalized quotation file path:', dbPath);
        
        req.body.quotationFileUrl = dbPath;
        req.body.quotationFileName = req.file.originalname;
    }
    next();
};

/**
 * Multer configuration for Excel/CSV file uploads (Sales Data Import)
 * Allows: .xlsx, .xls, .csv
 * Uses memory storage (files are parsed immediately, not saved to disk)
 */
const excelFileFilter = (_req: any, file: any, cb: any) => {
    const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
    ];
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
};

// Use memory storage for Excel imports (no need to persist the file)
export const uploadExcel = multer && multer.memoryStorage ? multer({
    storage: multer.memoryStorage(),
    fileFilter: excelFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max for Excel files
    },
}) : {
    single: () => (_req: Request, _res: Response, next: NextFunction) => {
        console.error('❌ Multer not configured. Install multer package.');
        next(new Error('File upload not configured'));
    }
};
