import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';

/**
 * Global error-handling middleware.
 * Catches all errors thrown / forwarded via next(err) and returns a
 * standardised { success, data, message } envelope. Never leaks raw
 * database or runtime errors to the client in production.
 */
export const errorHandler = (
    err: Error | AppError,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message =
        process.env.NODE_ENV === 'production' && statusCode === 500
            ? 'Internal server error'
            : err.message;

    console.error(`[ERROR] ${err.message}`, err.stack);

    res.status(statusCode).json({
        success: false,
        data: null,
        message,
    });
};
