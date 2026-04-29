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

// ══════════════════════════════════════════════════════════════════════════════
// DATA SHEET UPLOAD (Spare Parts Module)
// PDF data sheets for spare parts inventory
// ══════════════════════════════════════════════════════════════════════════════

// Ensure data sheets directory exists
const dataSheetsDir = path.join(__dirname, '../../uploads/datasheets');
if (!fs.existsSync(dataSheetsDir)) {
    fs.mkdirSync(dataSheetsDir, { recursive: true });
}

// Configure Multer Storage for Data Sheets
const dataSheetStorage = multer?.diskStorage ? multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
        cb(null, dataSheetsDir);
    },
    filename: (_req: any, file: any, cb: any) => {
        // Generate unique filename: datasheet-{timestamp}-{random}.ext
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `datasheet-${uniqueSuffix}${ext}`);
    }
}) : undefined;

// File Filter for Data Sheets - Only allow PDF
const dataSheetFileFilter = (_req: any, file: any, cb: any) => {
    const allowedMimes = ['application/pdf'];
    const allowedExts = ['.pdf'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF files are allowed for data sheets.'));
    }
};

// Multer Upload Configuration for Data Sheets
export const uploadDataSheet = multer && dataSheetStorage ? multer({
    storage: dataSheetStorage,
    fileFilter: dataSheetFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max for data sheets
    },
}) : {
    single: () => (_req: Request, _res: Response, next: NextFunction) => {
        console.error('❌ Multer not configured. Install multer package.');
        next(new Error('File upload not configured'));
    }
};

/**
 * Middleware to handle data sheet file upload for Spare Parts
 * Attaches file URL to req.body.dataSheetUrl if file is uploaded
 * Also attaches the original filename to req.body.dataSheetFileName
 */
export const handleDataSheetUpload = (req: Request, _res: Response, next: NextFunction): void => {
    if (req.file) {
        // Generate base path from filename
        let dbPath = `/uploads/datasheets/${req.file.filename}`;
        
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
        
        console.log('📎 Normalized data sheet file path:', dbPath);
        
        req.body.dataSheetUrl = dbPath;
        req.body.dataSheetFileName = req.file.originalname;
    }
    next();
};

// ══════════════════════════════════════════════════════════════════════════════
// MARKETING FILE UPLOAD (Content Tracker & Campaign Results)
// Images, PDFs, and other assets for marketing content and campaign reports
// ══════════════════════════════════════════════════════════════════════════════

// Ensure marketing documents directory exists
const marketingDocsDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(marketingDocsDir)) {
    fs.mkdirSync(marketingDocsDir, { recursive: true });
}

// Configure Multer Storage for Marketing Files
const marketingFileStorage = multer?.diskStorage ? multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
        cb(null, marketingDocsDir);
    },
    filename: (_req: any, file: any, cb: any) => {
        // Generate unique filename: marketing-{timestamp}-{random}.ext
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `marketing-${uniqueSuffix}${ext}`);
    }
}) : undefined;

// File Filter for Marketing Files - Allow images and PDFs
const marketingFileFilter = (_req: any, file: any, cb: any) => {
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images (JPG, PNG, GIF, WebP), PDF, DOC, and DOCX files are allowed.'));
    }
};

// Multer Upload Configuration for Marketing Files
export const uploadMarketingFile = multer && marketingFileStorage ? multer({
    storage: marketingFileStorage,
    fileFilter: marketingFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max for marketing files
    },
}) : {
    single: () => (_req: Request, _res: Response, next: NextFunction) => {
        console.error('❌ Multer not configured. Install multer package.');
        next(new Error('File upload not configured'));
    }
};

/**
 * Middleware to handle marketing file upload
 * Attaches file URL to req.body.fileUrl if file is uploaded
 * Also attaches the original filename to req.body.fileName
 */
export const handleMarketingFileUpload = (req: Request, _res: Response, next: NextFunction): void => {
    if (req.file) {
        // Generate base path from filename
        let dbPath = `/uploads/documents/${req.file.filename}`;
        
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
        
        console.log('📎 Normalized marketing file path:', dbPath);
        
        req.body.fileUrl = dbPath;
        req.body.fileName = req.file.originalname;
    }
    next();
};

// ══════════════════════════════════════════════════════════════════════════════
// EXPENSE INVOICE UPLOAD (Finance Module)
// PDFs and Images for general expense invoices
// ══════════════════════════════════════════════════════════════════════════════

// Ensure expenses directory exists
const expensesDir = path.join(__dirname, '../../uploads/expenses');
if (!fs.existsSync(expensesDir)) {
    fs.mkdirSync(expensesDir, { recursive: true });
}

// Configure Multer Storage for Expense Files
const expenseFileStorage = multer?.diskStorage ? multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
        cb(null, expensesDir);
    },
    filename: (_req: any, file: any, cb: any) => {
        // Generate unique filename: expense-{timestamp}-{random}.ext
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `expense-${uniqueSuffix}${ext}`);
    }
}) : undefined;

// File Filter for Expense Files - Allow images and PDFs
const expenseFileFilter = (_req: any, file: any, cb: any) => {
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
    ];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images (JPG, PNG, GIF, WebP) and PDF files are allowed.'));
    }
};

// Multer Upload Configuration for Expense Files
export const uploadExpenseFile = multer && expenseFileStorage ? multer({
    storage: expenseFileStorage,
    fileFilter: expenseFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
}) : {
    single: () => (_req: Request, _res: Response, next: NextFunction) => {
        console.error('❌ Multer not configured. Install multer package.');
        next(new Error('File upload not configured'));
    }
};

/**
 * Middleware to handle expense invoice upload
 * Attaches file URL to req.body.invoiceFile if file is uploaded
 */
export const handleExpenseFileUpload = (req: Request, _res: Response, next: NextFunction): void => {
    if (req.file) {
        let dbPath = `/uploads/expenses/${req.file.filename}`;
        dbPath = dbPath.replace(/\\/g, '/');
        dbPath = dbPath.replace(/^\/public\//, '/').replace(/^public\//, '/');
        if (!dbPath.startsWith('/')) dbPath = '/' + dbPath;
        dbPath = dbPath.replace(/\/+/g, '/');
        
        console.log('📎 Normalized expense invoice path:', dbPath);
        
        req.body.invoiceFile = dbPath;
    }
    next();
};


