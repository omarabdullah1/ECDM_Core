import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

/**
 * Middleware factory — validates req.body (or query/params) against
 * the supplied Zod schema before the request reaches the controller.
 */
export const validate =
    (schema: AnyZodObject, source: 'body' | 'query' | 'params' = 'body') =>
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
