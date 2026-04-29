import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/employee.service';
import { sendSuccess } from '../../../utils/apiResponse';
import fs from 'fs';

/**
 * Employee Controller - HR Module
 * 
 * Handles HTTP requests for employee profile management and 360 view.
 */

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getAll(req.query as Record<string, unknown>));
    } catch (e) {
        next(e);
    }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { item: await svc.getById(String(req.params.id)) });
    } catch (e) {
        next(e);
    }
};

/**
 * GET /api/hr/employees/:id/profile
 * 
 * Employee 360 Profile - aggregates:
 * - User profile information
 * - Attendance history and statistics
 * - Assigned tasks/work orders and performance metrics
 */
export const get360Profile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const profile = await svc.get360Profile(String(req.params.id));
        sendSuccess(res, profile);
    } catch (e: any) {
        console.error("============= GET360PROFILE 500 CRASH =============");
        console.error("Error Message:", e.message);
        console.error("Stack Trace:", e.stack);
        console.error("Params ID:", req.params.id);
        console.error("===================================================");
        
        // Force sending the exact error back to the client so Axios logs it
        res.status(500).json({
            success: false,
            message: `CRASH IN BACKEND: ${e.message}`,
            stack: e.stack
        });
    }
};

/**
 * PUT /api/hr/employees/:id/profile
 * 
 * Update employee HR profile fields
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatarUrl, address, employeeId, phone, department } = req.body;
        const employee = await svc.updateProfile(String(req.params.id), {
            avatarUrl,
            address,
            employeeId,
            phone,
            department,
        });
        sendSuccess(res, { item: employee }, 'Employee profile updated');
    } catch (e) {
        next(e);
    }
};

/**
 * POST /api/hr/employees/:id/documents
 * 
 * Add a document to employee profile
 */
export const addDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, fileUrl } = req.body;
        
        if (!title || !fileUrl) {
            sendSuccess(res, null, 'Title and fileUrl are required', 400);
            return;
        }
        
        const employee = await svc.addDocument(String(req.params.id), { title, fileUrl });
        sendSuccess(res, { item: employee }, 'Document added successfully');
    } catch (e) {
        next(e);
    }
};

/**
 * DELETE /api/hr/employees/:id/documents/:documentId
 * 
 * Remove a document from employee profile
 */
export const removeDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const employee = await svc.removeDocument(String(req.params.id), String(req.params.documentId));
        sendSuccess(res, { item: employee }, 'Document removed successfully');
    } catch (e) {
        next(e);
    }
};

/**
 * POST /api/hr/employees/:id/link-attendance
 * 
 * Link attendance records to user by setting employeeId
 */
export const linkAttendanceRecords = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { employeeId } = req.body;
        
        if (!employeeId) {
            sendSuccess(res, null, 'employeeId is required', 400);
            return;
        }
        
        const result = await svc.linkAttendanceRecords(String(req.params.id), employeeId);
        sendSuccess(res, result, `Linked ${result.linkedRecords} attendance records to employee`);
    } catch (e) {
        next(e);
    }
};

/**
 * POST /api/hr/employees/:id/avatar
 * 
 * Upload employee avatar/profile picture
 */
export const uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.file) {
            sendSuccess(res, null, 'No file uploaded', 400);
            return;
        }

        // Construct the URL for the uploaded file
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        const employee = await svc.updateProfile(String(req.params.id), { avatarUrl });
        sendSuccess(res, { item: employee, avatarUrl }, 'Avatar uploaded successfully');
    } catch (e) {
        // Clean up uploaded file on error
        if (req.file?.path) {
            fs.unlink(req.file.path, () => {});
        }
        next(e);
    }
};

/**
 * POST /api/hr/employees/:id/documents/upload
 * 
 * Upload a document file for employee
 */
export const uploadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.file) {
            sendSuccess(res, null, 'No file uploaded', 400);
            return;
        }

        const { title } = req.body;
        if (!title) {
            fs.unlink(req.file.path, () => {});
            sendSuccess(res, null, 'Document title is required', 400);
            return;
        }

        // Construct the URL for the uploaded file
        const fileUrl = `/uploads/documents/${req.file.filename}`;
        
        const employee = await svc.addDocument(String(req.params.id), { title, fileUrl });
        sendSuccess(res, { item: employee, document: { title, fileUrl } }, 'Document uploaded successfully');
    } catch (e) {
        // Clean up uploaded file on error
        if (req.file?.path) {
            fs.unlink(req.file.path, () => {});
        }
        next(e);
    }
};

