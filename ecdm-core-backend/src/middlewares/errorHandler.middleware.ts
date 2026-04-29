import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';
import mongoose from 'mongoose';

interface ErrorResponse {
    success: boolean;
    data: null;
    message: string;
    stack?: string;
}

export const errorHandler = (
    err: Error | AppError,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    let statusCode = err instanceof AppError ? err.statusCode : 500;
    let message = err.message;

    if (process.env.NODE_ENV === 'production') {
        if (statusCode === 500) message = 'Internal server error';
    }

    if (err instanceof mongoose.Error.CastError) {
        statusCode = 400;
        message = 'Invalid resource ID';
    }

    if (err instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        const validationErrors = Object.values(err.errors).map(e => e.message);
        message = validationErrors.join(', ');
    }

    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token. Please log in again.';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired. Please log in again.';
    }

    console.error(`[ERROR] ${err.name}: ${message}`, err.stack);

    const response: ErrorResponse = {
        success: false,
        data: null,
        message,
    };

    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

