import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { UserRole } from '../features/auth/auth.types';
import { ModuleName } from '../features/shared/types/modification-request.types';
import * as modificationRequestService from '../features/shared/services/modification-request.service';

/**
 * Maker-Checker Interceptor Utility
 * 
 * This utility provides functions to intercept update requests from non-admin users
 * and create modification requests that require admin approval.
 */

// Admin roles that can bypass the maker-checker workflow
const ADMIN_ROLES: UserRole[] = [UserRole.SuperAdmin, UserRole.Manager];

/**
 * Check if a user has admin privileges
 */
export const isAdminUser = (userRole: UserRole): boolean => {
    return ADMIN_ROLES.includes(userRole);
};

/**
 * Intercept an update request and create a modification request if user is not admin.
 * Returns true if the request was intercepted (non-admin), false if admin can proceed.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param moduleName - The module being updated (e.g., 'SalesOrder')
 * @param originalDocument - The current document state from the database
 * @param proposedData - The new data being submitted
 * @returns Promise<boolean> - true if intercepted, false if admin can proceed
 * 
 * @example
 * // In your PATCH/PUT controller:
 * const salesOrder = await SalesOrder.findById(id);
 * 
 * const intercepted = await interceptUpdate(
 *   req, res, 
 *   ModuleName.SalesOrder, 
 *   salesOrder, 
 *   req.body
 * );
 * 
 * if (intercepted) return; // Request has been intercepted, response already sent
 * 
 * // Admin: proceed with direct update
 * const updated = await SalesOrder.findByIdAndUpdate(id, req.body, { new: true });
 */
export const interceptUpdate = async (
    req: Request,
    res: Response,
    moduleName: ModuleName,
    originalDocument: mongoose.Document,
    proposedData: Record<string, unknown>
): Promise<boolean> => {
    const userRole = req.user?.role;
    
    // If user is admin, they can proceed with direct update
    if (userRole && isAdminUser(userRole)) {
        return false;
    }

    // Non-admin user: create a modification request
    try {
        await modificationRequestService.create({
            moduleName,
            recordId: originalDocument._id.toString(),
            requestedBy: req.user?.userId || '',
            originalData: originalDocument.toObject ? originalDocument.toObject() : originalDocument,
            proposedData,
        });

        res.status(202).json({
            success: true,
            data: null,
            message: 'Your update request has been submitted for admin approval.',
        });

        return true;
    } catch (error) {
        // If there's already a pending request, throw the error
        throw error;
    }
};

/**
 * Create a middleware factory for intercepting updates on a specific module.
 * This provides a cleaner way to apply the maker-checker pattern.
 * 
 * @param moduleName - The module name for this middleware
 * @param getDocument - Function to retrieve the current document
 * @param getProposedData - Function to extract proposed data from request
 * 
 * @example
 * const salesOrderInterceptor = createInterceptorMiddleware(
 *   ModuleName.SalesOrder,
 *   async (req) => SalesOrder.findById(req.params.id),
 *   (req) => req.body
 * );
 * 
 * router.patch('/:id', salesOrderInterceptor, ctrl.update);
 */
export const createInterceptorMiddleware = (
    moduleName: ModuleName,
    getDocument: (req: Request) => Promise<mongoose.Document | null>,
    getProposedData: (req: Request) => Record<string, unknown> = (req) => req.body
) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userRole = req.user?.role;

        // Admin users bypass the interceptor
        if (userRole && isAdminUser(userRole)) {
            return next();
        }

        try {
            const document = await getDocument(req);
            
            if (!document) {
                res.status(404).json({
                    success: false,
                    data: null,
                    message: 'Record not found',
                });
                return;
            }

            const proposedData = getProposedData(req);

            await modificationRequestService.create({
                moduleName,
                recordId: document._id.toString(),
                requestedBy: req.user?.userId || '',
                originalData: document.toObject ? document.toObject() : document,
                proposedData,
            });

            res.status(202).json({
                success: true,
                data: null,
                message: 'Your update request has been submitted for admin approval.',
            });
        } catch (error) {
            next(error);
        }
    };
};
