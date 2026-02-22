import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/apiResponse';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';

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
