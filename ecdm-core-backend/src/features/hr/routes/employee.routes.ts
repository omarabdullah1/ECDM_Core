import { Router } from 'express';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import * as ctrl from '../controllers/employee.controller';
import { UserRole } from '../../auth/auth.types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directories exist
const avatarsDir = path.join(__dirname, '../../../../uploads/avatars');
const documentsDir = path.join(__dirname, '../../../../uploads/documents');
[avatarsDir, documentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Configure multer for document uploads
const documentStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, documentsDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const documentUpload = multer({
    storage: documentStorage,
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'image/jpeg', 'image/png', 'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, images, and Word documents are allowed'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

// All routes require authentication
router.use(authenticate);

// Employee list and basic profile
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// Employee 360 Profile
router.get('/:id/profile', ctrl.get360Profile);
router.put('/:id/profile', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.updateProfile);

// Avatar upload
router.post('/:id/avatar', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), avatarUpload.single('avatar'), ctrl.uploadAvatar);

// Document management
router.post('/:id/documents', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.addDocument);
router.post('/:id/documents/upload', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), documentUpload.single('document'), ctrl.uploadDocument);
router.delete('/:id/documents/:documentId', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.removeDocument);

// Link attendance records
router.post('/:id/link-attendance', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.linkAttendanceRecords);

export default router;
