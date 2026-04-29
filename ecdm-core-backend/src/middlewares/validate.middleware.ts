import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { sendError } from '../utils/apiResponse';

/**
 * Middleware factory — validates req.body (or query/params) against
 * the supplied Zod schema before the request reaches the controller.
 * Supports both ZodObject and ZodEffects (schemas with .refine()).
 */
export const validate =
    (schema: ZodTypeAny, source: 'body' | 'query' | 'params' = 'body') =>
        (req: Request, _res: Response, next: NextFunction): void => {
            try {
                schema.parse(req[source]);
                next();
            } catch (err) {
                if (err instanceof ZodError) {
                    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
                    sendError(_res, message, 422);
                    return;
                }
                next(err);
            }
        };

