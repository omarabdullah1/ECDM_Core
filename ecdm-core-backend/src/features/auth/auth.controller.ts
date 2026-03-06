import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/apiResponse';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';
import { logAction } from '../../utils/auditLogger';
import { AuditAction } from '../shared/types/audit-log.types';

// ── POST /api/auth/register ─────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { user, token } = await authService.registerUser(req.body);
        sendSuccess(res, { user, token }, 'User registered successfully', 201);
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/login ────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { user, token } = await authService.loginUser(req.body);
        
        // Log the login action
        await logAction(user._id, AuditAction.LOGIN, 'User', user._id, { email: user.email }, req);
        
        sendSuccess(res, { user, token }, 'Login successful');
    } catch (err) {
        next(err);
    }
};

// ── GET /api/auth/me ────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await authService.getMe(req.user!.userId);
        sendSuccess(res, { user }, 'Current user retrieved');
    } catch (err) {
        next(err);
    }
};

// ── GET /api/auth/users ─────────────────────────────────────────────
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { page, limit, skip } = parsePagination(req.query as Record<string, string>);
        const { users, total } = await authService.getAllUsers(req.query, skip, limit);
        const result = buildPaginatedResult(users, total, { page, limit, skip });
        sendSuccess(res, result, 'Users retrieved');
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/users ────────────────────────────────────────────
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await authService.createUser(req.body);
        
        // Log the user creation action
        await logAction(
            req.user!.userId,
            AuditAction.CREATE,
            'User',
            user._id,
            { email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
            req,
        );
        
        sendSuccess(res, { user }, 'User created successfully', 201);
    } catch (err) {
        next(err);
    }
};

// ── GET /api/auth/users/:id ─────────────────────────────────────────
export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        
        // Log the user update action
        await logAction(
            req.user!.userId,
            AuditAction.UPDATE,
            'User',
            user._id,
            { updatedFields: Object.keys(req.body) },
            req,
        );
        
        // Log the user deletion action
        await logAction(
            req.user!.userId,
            AuditAction.DELETE,
            'User',
            req.params.id,
            { deletedUserId: req.params.id },
            req,
        );
        
        
        const user = await authService.getUserById(req.params.id);
        sendSuccess(res, { user }, 'User retrieved');
    } catch (err) {
        next(err);
    }
};

// ── PUT /api/auth/users/:id ─────────────────────────────────────────
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await authService.updateUser(req.params.id, req.body);
        sendSuccess(res, { user }, 'User updated successfully');
    } catch (err) {
        next(err);
    }
};

// ── DELETE /api/auth/users/:id ──────────────────────────────────────
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await authService.deleteUser(req.params.id);
        sendSuccess(res, null, 'User deleted successfully');
    } catch (err) {
        next(err);
    }
};
