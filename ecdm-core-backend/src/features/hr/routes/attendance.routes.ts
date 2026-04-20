import { Router } from 'express';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createAttendanceSchema, updateAttendanceSchema } from '../validation/attendance.validation';
import * as ctrl from '../controllers/attendance.controller';
import { UserRole } from '../../auth/auth.types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../../../uploads/attendance');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for Excel/CSV uploads
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'attendance-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/vnd.ms-excel', // xls
        'text/csv', // csv
        'application/csv',
    ];
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD operations
router.post('/', validate(createAttendanceSchema), ctrl.create);
router.get('/', ctrl.getAll);
router.get('/folders', ctrl.getAttendanceFolders); // Folders aggregation endpoint
router.get('/template', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.downloadTemplate); // Template download
router.get('/:id', ctrl.getById);
router.put('/:id', validate(updateAttendanceSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.remove);

// Bulk operations (Admin/HR only)
router.post('/bulk-delete', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.bulkDelete);

// Excel/CSV Upload (Admin/HR only)
router.post('/upload', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), upload.single('file'), ctrl.uploadExcel);

// Employee-specific queries
router.get('/employee/:employeeId', ctrl.getByEmployeeId);
router.get('/user/:userId', ctrl.getByUserId);
router.get('/stats/:userId', ctrl.getEmployeeStats);

export default router;
