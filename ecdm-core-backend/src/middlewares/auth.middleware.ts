import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/apiError';
import { UserRole } from '../features/auth/auth.types';

// ── Augment Express Request with user payload ───────────────────────
export interface JwtPayload {
    userId: string;
    role: UserRole;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Verify JWT access token from the Authorization header.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return next(new AppError('Authentication required', 401));
    }

    try {
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        req.user = decoded;
        next();
    } catch {
        next(new AppError('Invalid or expired token', 401));
    }
};

/**
 * Factory — restrict access to specific roles.
 */
export const authorise = (...roles: UserRole[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError('Forbidden: insufficient permissions', 403));
        }
        next();
    };
};

/**
 * Admin-only middleware — restricts access to SuperAdmin and Manager (Admin) roles.
 * Use this for sensitive operations like bulk delete.
 * 
 * @description
 * This middleware MUST be applied AFTER the authenticate middleware.
 * It checks if the authenticated user has admin privileges (SuperAdmin or Manager).
 * Returns 403 Forbidden if the user lacks admin access.
 * 
 * @example
 * // Usage in routes:
 * router.post('/bulk-delete', isAdmin, ctrl.bulkDelete);
 */
export const isAdmin = (req: Request, _res: Response, next: NextFunction): void => {
    // Define admin roles - SuperAdmin has full access, Manager has admin-level access
    const adminRoles: UserRole[] = [UserRole.SuperAdmin, UserRole.Manager];
    
    if (!req.user) {
        return next(new AppError('Forbidden: Authentication required', 401));
    }
    
    if (!adminRoles.includes(req.user.role)) {
        return next(new AppError('Forbidden: Admin access required. Only SuperAdmin or Manager roles can perform this action.', 403));
    }
    
    next();
};
