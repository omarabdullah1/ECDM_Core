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
 * Helper function to check if a field value is considered "empty"
 */
const isEmptyValue = (value: unknown): boolean => {
    if (value === null || value === undefined || value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
};

/**
 * Intercept an update request with smart logic:
 * - Fields that were empty → Direct update (no approval needed)
 * - Fields that had data → Modification request (needs approval)
 * 
 * Returns true if the request was fully/partially intercepted, false if admin can proceed.
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
 * if (intercepted) return; // Request has been handled, response already sent
 * 
 * // Admin: proceed with direct update
 * const updated = await SalesOrder.findByIdAndUpdate(id, req.body, { new: true });
 */
export const interceptUpdate = async (
    req: Request,
    res: Response,
    moduleName: ModuleName,
    originalDocument: mongoose.Document,
    proposedData: Record<string, unknown>,
    onDirectSave?: (documentId: string) => Promise<void>
): Promise<boolean> => {
    const userRole = req.user?.role;

    // If user is admin, they can proceed with direct update
    if (userRole && isAdminUser(userRole)) {
        return false;
    }

    // Non-admin user: Apply smart logic to split direct updates vs modification requests
    try {
        const directUpdates: Record<string, unknown> = {};
        const changesNeedingApproval: Record<string, unknown> = {};

        // System/immutable fields that should never be directly updated or require approval
        const systemFields = ['_id', '__v', 'createdAt', 'updatedAt'];

        // Operational fields that NEVER require admin approval (routine business operations)
        // These are workflow/status fields that users need to update freely as part of their daily work
        const exemptFields = [
            'status',
            'notes',
            'reason',
            'issue',
            'order',  // ✅ Critical: Triggers SalesOrder auto-creation
            'salesPerson',
            'reviewNotes',
            // Follow-up fields (sales tracking/workflow)
            'followUpFirst',
            'followUpSecond',
            'followUpThird',
            'quotationStatusFirstFollowUp',
            'statusSecondFollowUp',
            'finalStatusThirdFollowUp',
            'reasonOfQuotation',
            // Operational order details
            'typeOfOrder',
            'salesPlatform',
            'siteInspectionDate',
            'technicalInspectionDetails',
            'orderIssue',
            // ✅ CRITICAL FIX: Quotation fields (file uploads & dynamic builder)
            // Sales reps need to upload/replace quotations instantly without admin approval
            'quotationFileUrl',
            'quotationFileName',
            'quotationFile',
            'quotation',  // Dynamic quotation builder object
            'quotationStatus',
            'isTechnicalInspectionRequired',
            'technicalInspectionDate'
        ];

        // Convert document to plain object for comparison
        const originalData = originalDocument.toObject ? originalDocument.toObject() : originalDocument;

        // Analyze each field in the proposed data
        for (const [key, newValue] of Object.entries(proposedData)) {
            // Skip system fields
            if (systemFields.includes(key)) continue;

            const oldValue = (originalData as any)[key];

            // Use JSON.stringify for robust comparison (handles nested objects like follow-ups)
            const normalizedOldValue = JSON.stringify(oldValue);
            const normalizedNewValue = JSON.stringify(newValue);

            // Skip if value hasn't changed (using JSON comparison)
            if (normalizedOldValue === normalizedNewValue) {
                console.log(`⏭️  Skipping ${key}: no change`);
                continue;
            }

            // Skip if new value is empty (not filling or changing anything)
            if (isEmptyValue(newValue)) continue;

            // SMART LOGIC:
            // 1. If field is exempt → Always direct update (no approval needed)
            // 2. If old value was empty and new value is not empty → Direct update
            // 3. If old value had data and new value is different → Needs approval
            if (exemptFields.includes(key)) {
                console.log(`✅ ${key}: exempt field → direct update`);
                directUpdates[key] = newValue;
            } else if (isEmptyValue(oldValue)) {
                console.log(`📝 ${key}: filling empty field → direct update`);
                directUpdates[key] = newValue;
            }
            // If old value had data and new value is different → Needs approval
            else {
                console.log(`⏳ ${key}: updating existing data → needs approval`);
                changesNeedingApproval[key] = newValue;
            }
        }

        console.log(`🔍 Smart Update Analysis for ${moduleName}:`, {
            directUpdates: Object.keys(directUpdates),
            changesNeedingApproval: Object.keys(changesNeedingApproval),
        });

        // Apply direct updates immediately (if any)
        let updatedDocument = originalDocument;
        if (Object.keys(directUpdates).length > 0) {
            // Apply updates to the document
            Object.assign(originalDocument, directUpdates);
            updatedDocument = await originalDocument.save();
            console.log(`✅ Direct updates applied: ${Object.keys(directUpdates).join(', ')}`);

            // Trigger post-save callback for automation (if provided)
            if (onDirectSave) {
                console.log('🔥 Calling post-save callback for automation...');
                try {
                    await onDirectSave(updatedDocument._id.toString());
                } catch (callbackError) {
                    console.error('⚠️ Post-save callback error:', callbackError);
                }
            }
        }

        // Create modification request for changes needing approval (if any)
        let modificationRequestCreated = false;
        if (Object.keys(changesNeedingApproval).length > 0) {
            // Check if there is already a pending modification request for this record
            const hasPending = await modificationRequestService.hasPendingRequest(
                moduleName,
                originalDocument._id.toString()
            );

            if (hasPending) {
                // We have pending changes BUT we also might have applied direct updates
                const directUpdatesApplied = Object.keys(directUpdates).length > 0;

                if (directUpdatesApplied) {
                    res.status(409).json({
                        success: false,
                        data: updatedDocument,
                        message: 'Direct updates applied successfully, but non-exempt changes were blocked because a pending modification request already exists.',
                        meta: {
                            directUpdatesApplied: true,
                            modificationRequestCreated: false,
                            directlyUpdatedFields: Object.keys(directUpdates),
                            blockedFields: Object.keys(changesNeedingApproval),
                        }
                    });
                    return true; // Return early, response sent
                } else {
                    // Nothing was applied, and we can't create a new request
                    throw new Error('409_CONFLICT'); // Handled by catch block
                }
            }

            await modificationRequestService.create({
                moduleName,
                recordId: originalDocument._id.toString(),
                requestedBy: req.user?.userId || '',
                originalData: updatedDocument.toObject ? updatedDocument.toObject() : updatedDocument,
                proposedData: changesNeedingApproval, // Only submit changes that need approval
            });
            modificationRequestCreated = true;
            console.log(`📝 Modification request created for: ${Object.keys(changesNeedingApproval).join(', ')}`);
        }

        // Prepare response based on what happened
        const directUpdatesApplied = Object.keys(directUpdates).length > 0;

        if (directUpdatesApplied && modificationRequestCreated) {
            // Both happened: Some fields updated directly, others need approval
            res.status(200).json({
                success: true,
                data: updatedDocument,
                message: 'New fields saved successfully! Changes to existing data have been submitted for admin approval.',
                meta: {
                    directUpdatesApplied: true,
                    modificationRequestCreated: true,
                    directlyUpdatedFields: Object.keys(directUpdates),
                    fieldsAwaitingApproval: Object.keys(changesNeedingApproval),
                }
            });
        } else if (modificationRequestCreated) {
            // Only modification request: All changes need approval
            res.status(202).json({
                success: true,
                data: null,
                message: 'Your changes modify existing data and have been submitted for admin approval.',
                meta: {
                    directUpdatesApplied: false,
                    modificationRequestCreated: true,
                    fieldsAwaitingApproval: Object.keys(changesNeedingApproval),
                }
            });
        } else if (directUpdatesApplied) {
            // Only direct updates: All fields were empty before
            res.status(200).json({
                success: true,
                data: updatedDocument,
                message: 'Data saved successfully!',
                meta: {
                    directUpdatesApplied: true,
                    modificationRequestCreated: false,
                    directlyUpdatedFields: Object.keys(directUpdates),
                }
            });
        } else {
            // Nothing to update (all values were the same or empty)
            res.status(200).json({
                success: true,
                data: updatedDocument,
                message: 'No changes detected.',
                meta: {
                    directUpdatesApplied: false,
                    modificationRequestCreated: false,
                }
            });
        }

        return true; // Request was handled
    } catch (error: any) {
        if (error.message === '409_CONFLICT' || (error.statusCode === 409)) {
            res.status(409).json({
                success: false,
                data: null,
                message: 'A pending modification request already exists for this record. Please wait for it to be reviewed.',
            });
            return true;
        }
        // If there's another error, throw it
        throw error;
    }
};

/**
 * Create a middleware factory for intercepting updates on a specific module.
 * This provides a cleaner way to apply the maker-checker pattern with smart logic.
 * 
 * Smart Logic:
 * - Fields that were empty → Direct update (no approval needed)
 * - Fields that had data → Modification request (needs approval)
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

            // Apply smart update logic
            const directUpdates: Record<string, unknown> = {};
            const changesNeedingApproval: Record<string, unknown> = {};

            const systemFields = ['_id', '__v', 'createdAt', 'updatedAt'];

            // Operational fields that NEVER require admin approval (routine business operations)
            const exemptFields = ['status', 'notes', 'reason', 'issue', 'salesPerson', 'reviewNotes'];

            const originalData = document.toObject ? document.toObject() : document;

            for (const [key, newValue] of Object.entries(proposedData)) {
                if (systemFields.includes(key)) continue;

                const oldValue = (originalData as any)[key];

                // Normalize values for comparison
                const normalizedOldValue = oldValue === null || oldValue === undefined ? '' : String(oldValue);
                const normalizedNewValue = newValue === null || newValue === undefined ? '' : String(newValue);

                if (normalizedOldValue === normalizedNewValue) continue;
                if (isEmptyValue(newValue)) continue;

                // SMART LOGIC with exempt fields
                if (exemptFields.includes(key)) {
                    directUpdates[key] = newValue;
                } else if (isEmptyValue(oldValue)) {
                    directUpdates[key] = newValue;
                } else {
                    changesNeedingApproval[key] = newValue;
                }
            }

            console.log(`🔍 Smart Middleware Update for ${moduleName}:`, {
                directUpdates: Object.keys(directUpdates),
                changesNeedingApproval: Object.keys(changesNeedingApproval),
            });

            // Apply direct updates
            let updatedDocument = document;
            if (Object.keys(directUpdates).length > 0) {
                Object.assign(document, directUpdates);
                updatedDocument = await document.save();
                console.log(`✅ Direct updates applied: ${Object.keys(directUpdates).join(', ')}`);
            }

            // Create modification request for changes needing approval
            let modificationRequestCreated = false;
            if (Object.keys(changesNeedingApproval).length > 0) {
                // Check if there is already a pending modification request for this record
                const hasPending = await modificationRequestService.hasPendingRequest(
                    moduleName,
                    document._id.toString()
                );

                if (hasPending) {
                    const directUpdatesApplied = Object.keys(directUpdates).length > 0;

                    if (directUpdatesApplied) {
                        res.status(409).json({
                            success: false,
                            data: updatedDocument,
                            message: 'Direct updates applied successfully, but non-exempt changes were blocked because a pending modification request already exists.',
                            meta: {
                                directUpdatesApplied: true,
                                modificationRequestCreated: false,
                                directlyUpdatedFields: Object.keys(directUpdates),
                                blockedFields: Object.keys(changesNeedingApproval),
                            }
                        });
                        return; // Return early, response sent
                    } else {
                        throw new Error('409_CONFLICT'); // Handled by catch block
                    }
                }

                await modificationRequestService.create({
                    moduleName,
                    recordId: document._id.toString(),
                    requestedBy: req.user?.userId || '',
                    originalData: updatedDocument.toObject ? updatedDocument.toObject() : updatedDocument,
                    proposedData: changesNeedingApproval,
                });
                modificationRequestCreated = true;
                console.log(`📝 Modification request created for: ${Object.keys(changesNeedingApproval).join(', ')}`);
            }

            // Send appropriate response
            const directUpdatesApplied = Object.keys(directUpdates).length > 0;

            if (directUpdatesApplied && modificationRequestCreated) {
                res.status(200).json({
                    success: true,
                    data: updatedDocument,
                    message: 'New fields saved successfully! Changes to existing data have been submitted for admin approval.',
                    meta: {
                        directUpdatesApplied: true,
                        modificationRequestCreated: true,
                        directlyUpdatedFields: Object.keys(directUpdates),
                        fieldsAwaitingApproval: Object.keys(changesNeedingApproval),
                    }
                });
            } else if (modificationRequestCreated) {
                res.status(202).json({
                    success: true,
                    data: null,
                    message: 'Your changes modify existing data and have been submitted for admin approval.',
                    meta: {
                        directUpdatesApplied: false,
                        modificationRequestCreated: true,
                        fieldsAwaitingApproval: Object.keys(changesNeedingApproval),
                    }
                });
            } else if (directUpdatesApplied) {
                res.status(200).json({
                    success: true,
                    data: updatedDocument,
                    message: 'Data saved successfully!',
                    meta: {
                        directUpdatesApplied: true,
                        modificationRequestCreated: false,
                        directlyUpdatedFields: Object.keys(directUpdates),
                    }
                });
            } else {
                res.status(200).json({
                    success: true,
                    data: updatedDocument,
                    message: 'No changes detected.',
                    meta: {
                        directUpdatesApplied: false,
                        modificationRequestCreated: false,
                    }
                });
            }
        } catch (error: any) {
            if (error.message === '409_CONFLICT' || (error.statusCode === 409)) {
                res.status(409).json({
                    success: false,
                    data: null,
                    message: 'A pending modification request already exists for this record. Please wait for it to be reviewed.',
                });
            } else {
                next(error);
            }
        }
    };
};
