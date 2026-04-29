import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/apiResponse';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';
import { logAction } from '../../utils/auditLogger';
import { AuditAction } from '../shared/types/audit-log.types';
import { updateMeSchema } from './auth.validation';


const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const accessTokenCookieOptions = {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
};

const getRefreshToken = (req: Request): string | undefined => {
    if (req.cookies?.refreshToken) return req.cookies.refreshToken;
    if (typeof req.body.refreshToken === 'string') return req.body.refreshToken;
    return undefined;
};

// ── POST /api/auth/register ─────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { user, tokens } = await authService.registerUser(req.body);
        
        res.cookie('accessToken', tokens.accessToken, accessTokenCookieOptions);
        res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
        
        sendSuccess(res, { user, accessToken: tokens.accessToken }, 'User registered successfully', 201);
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/login ────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { user, tokens } = await authService.loginUser(req.body);
        
        await logAction(user._id, AuditAction.LOGIN, 'User', user._id, { email: user.email }, req);
        
        res.cookie('accessToken', tokens.accessToken, accessTokenCookieOptions);
        res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
        
        sendSuccess(res, { user, accessToken: tokens.accessToken }, 'Login successful');
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/refresh ─────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const refreshTokenStr = getRefreshToken(req);
        if (!refreshTokenStr) {
            sendSuccess(res, { accessToken: null }, 'No refresh token provided');
            return;
        }
        
        const tokens = await authService.refreshAccessToken(refreshTokenStr);
        
        res.cookie('accessToken', tokens.accessToken, accessTokenCookieOptions);
        res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
        
        sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/logout ─────────────────────────────────────────
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (req.user) {
            await authService.logoutUser(req.user.userId);
        }
        
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        
        sendSuccess(res, null, 'Logged out successfully');
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

// ── PATCH /api/auth/me (or /api/users/me) ───────────────────────────
export const updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const parsed = updateMeSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: parsed.error.errors[0].message });
            return;
        }
        const user = await authService.updateMe(req.user!.userId, parsed.data);
        sendSuccess(res, { user }, 'Profile updated successfully');
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
        const user = await authService.getUserById(req.params.id as string);
        sendSuccess(res, { user }, 'User retrieved');
    } catch (err) {
        next(err);
    }
};

// ── PUT /api/auth/users/:id ─────────────────────────────────────────
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await authService.updateUser(req.params.id as string, req.body);
        sendSuccess(res, { user }, 'User updated successfully');
    } catch (err) {
        next(err);
    }
};

// ── DELETE /api/auth/users/:id ──────────────────────────────────────
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await authService.deleteUser(req.params.id as string);
        sendSuccess(res, null, 'User deleted successfully');
    } catch (err) {
        next(err);
    }
};

