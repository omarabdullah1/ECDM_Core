import { Response } from 'express';

// ── Unified API response format ─────────────────────────────────────
export interface ApiResponsePayload<T = unknown> {
    success: boolean;
    data: T | null;
    message: string;
}

export const sendSuccess = <T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
): Response<ApiResponsePayload<T>> => {
    return res.status(statusCode).json({
        success: true,
        data,
        message,
    });
};

export const sendError = (
    res: Response,
    message = 'Something went wrong',
    statusCode = 500,
): Response<ApiResponsePayload<null>> => {
    return res.status(statusCode).json({
        success: false,
        data: null,
        message,
    });
};

