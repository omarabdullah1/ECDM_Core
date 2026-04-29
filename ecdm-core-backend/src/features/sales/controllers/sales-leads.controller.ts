import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/sales-leads.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { interceptUpdate } from '../../../utils/makerChecker';
import { ModuleName } from '../../shared/types/modification-request.types';
import SalesLead from '../models/sales-lead.model';
import { logAction } from '../../../utils/auditLogger';
import { AuditAction } from '../../shared/types/audit-log.types';
import User from '../../auth/auth.model';
import { SalesLeadStatus } from '../types/sales-leads.types';
import SalesOrder from '../models/sales-order.model';
import { OrderStatus, ThirdFollowUpStatus } from '../types/sales-order.types';
import Customer from '../../shared/models/contact.model';

export const create = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { lead: await svc.create(req.body) }, 'Sales lead created', 201); } catch (e) { next(e); } };
export const getAll = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAll(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { lead: await svc.getById(String(req.params.id)) }); } catch (e) { next(e); } };

// PUT update (legacy) - does not auto-track salesPerson
export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { lead: await svc.update(String(req.params.id), req.body) }, 'Sales lead updated');
    } catch (e) { next(e); }
};

// PATCH update - auto-tracks salesPerson from logged-in user
// MAKER-CHECKER: Non-admin users submit changes for approval
export const patch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 SALES LEAD UPDATE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Lead ID:', req.params.id);
        console.log('User Role:', req.user?.role);
        console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        // ═══════════════════════════════════════════════════════════════════
        // MAKER-CHECKER INTERCEPTOR
        // Non-admin users submit changes for approval instead of direct update
        // ═══════════════════════════════════════════════════════════════════
        // CRITICAL: We do NOT populate customerId here because interceptUpdate 
        // calls .save() on the document, and saving populated documents can 
        // cause unexpected behavior or validation errors.
        const targetRecord = await SalesLead.findById(req.params.id);

        if (!targetRecord) {
            sendSuccess(res, null, 'Sales lead not found', 404);
            return;
        }

        // Get user info from authentication middleware (needed for salesPerson tracking)
        let userInfo: { email?: string; name?: string } | undefined;

        if (req.user?.userId) {
            const user = await User.findById(req.user.userId).select('email firstName lastName').lean();
            if (user) {
                userInfo = {
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`.trim(),
                };
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // ROLE-BASED ACCESS CONTROL (RBAC) & OWNERSHIP
        // ═══════════════════════════════════════════════════════════════════
        const isAdmin = req.user?.role === 'Admin' || req.user?.role === 'SuperAdmin';
        const isOwner = targetRecord.salesPerson && userInfo && (
            userInfo.email === targetRecord.salesPerson ||
            userInfo.name === targetRecord.salesPerson
        );

        // If the lead is already assigned to someone else and user is not an admin, deny update
        if (targetRecord.salesPerson && !isOwner && !isAdmin) {
            console.log('❌ Forbidden update attempt by non-owner:', userInfo?.email || userInfo?.name);
            sendSuccess(res, null, 'You do not have permission to modify this lead. It belongs to another salesperson.', 403);
            return;
        }

        // ═══════════════════════════════════════════════════════════════════
        // HANDLE CUSTOMER SSOT UPDATES (address, region)
        // These fields are stored in Customer, not SalesLead
        // ═══════════════════════════════════════════════════════════════════
        const { address, region, ...salesLeadData } = req.body;

        // Prevent manual override of salesPerson field for non-admins
        if (!isAdmin && salesLeadData.salesPerson) {
            delete salesLeadData.salesPerson;
        }

        if (address !== undefined || region !== undefined) {
            const customerUpdate: Record<string, unknown> = {};
            if (address !== undefined) customerUpdate.address = address;
            if (region !== undefined) customerUpdate.region = region;

            await Customer.findByIdAndUpdate(targetRecord.customerId, customerUpdate, {
                runValidators: true,
            });
            console.log('✅ Customer SSOT fields updated:', Object.keys(customerUpdate).join(', '));
        }

        // ═══════════════════════════════════════════════════════════════════
        // HANDLE SALESPERSON AUTO-TRACKING & STATUS TRANSITION
        // ═══════════════════════════════════════════════════════════════════
        // Broaden interaction check: any field update triggers tracking/status change
        const hasInteraction = Object.keys(req.body).length > 0;

        if (hasInteraction && userInfo && !targetRecord.salesPerson) {
            salesLeadData.salesPerson = userInfo.email || userInfo.name || '';
            console.log('✅ Auto-assigned salesPerson (first interaction):', salesLeadData.salesPerson);
        }

        // Auto-set status from New to Contacted if updating ANYTHING
        // This ensures leads don't stay "New" once someone starts interacting with them
        if (targetRecord.status === SalesLeadStatus.New && hasInteraction && (!salesLeadData.status || salesLeadData.status === SalesLeadStatus.New)) {
            salesLeadData.status = SalesLeadStatus.Contacted;
            console.log('✅ Auto-set status to Contacted (New → Contacted transition)');
        }

        // ═══════════════════════════════════════════════════════════════════
        // RUN MAKER-CHECKER INTERCEPTOR with cleaned data (no Customer fields)
        // ═══════════════════════════════════════════════════════════════════
        const intercepted = await interceptUpdate(
            req,
            res,
            ModuleName.SalesLead,
            targetRecord,
            salesLeadData  // Send only SalesLead fields
        );

        // ═══════════════════════════════════════════════════════════════════
        // CRITICAL: SALES ORDER AUTO-CREATION TRIGGER FOR NON-ADMIN USERS
        // When interceptUpdate applies direct updates (exempt fields), it returns 
        // early and never calls svc.update() where the auto-creation logic lives.
        // This trigger ensures SalesOrder is created for both Admin and Sales users.
        // ═══════════════════════════════════════════════════════════════════
        if (intercepted && salesLeadData.order) {
            try {
                const updatedLead = await SalesLead.findById(req.params.id);

                if (updatedLead) {
                    // Map salesPerson to User ObjectId (used by both Yes/No paths)
                    let salesPersonId = null;
                    if (updatedLead.salesPerson) {
                        const user = await User.findOne({
                            $or: [
                                { email: { $regex: new RegExp(`^${updatedLead.salesPerson.trim()}$`, 'i') } },
                                { $expr: { $eq: [{ $concat: ['$firstName', ' ', '$lastName'] }, updatedLead.salesPerson.trim()] } }
                            ]
                        }).select('_id');
                        if (user) salesPersonId = user._id;
                    }
                    const targetCustomerId = updatedLead.customerId?._id || updatedLead.customerId;
                    const existingOrder = await SalesOrder.findOne({ salesLead: updatedLead._id });

                    // ── Case: Yes → Create or Restore Sales Order ──────────────────
                    if (salesLeadData.order === 'Yes') {
                        if (existingOrder) {
                            console.log(`🔄 Restoring SalesOrder to Pending for Lead ${updatedLead._id}`);
                            existingOrder.orderStatus = OrderStatus.Pending;
                            existingOrder.finalStatusThirdFollowUp = '';
                            await existingOrder.save();
                        } else {
                            console.log(`📦 Auto-creating SalesOrder for Lead ${updatedLead._id} (non-admin)`);
                            await SalesOrder.create({
                                salesLead: updatedLead._id,
                                customer: targetCustomerId,
                                salesPerson: salesPersonId,
                                orderStatus: OrderStatus.Pending,
                                issueDescription: updatedLead.issue || 'Order created from Sales Lead',
                                typeOfOrder: '',
                                salesPlatform: '',
                            });
                            console.log('   ✅ SalesOrder auto-created successfully');
                        }
                    }

                    // ── Case: No → Archive to Non-Potential ────────────────────────
                    else if (salesLeadData.order === 'No') {
                        if (existingOrder) {
                            console.log(`📦 Archiving SalesOrder as Not Potential for Lead ${updatedLead._id} (non-admin)`);
                            existingOrder.orderStatus = OrderStatus.Canceled;
                            existingOrder.finalStatusThirdFollowUp = ThirdFollowUpStatus.NotPotential;
                            await existingOrder.save();
                        } else {
                            console.log(`✨ Creating Archived SalesOrder for Lead ${updatedLead._id} (non-admin)`);
                            await SalesOrder.create({
                                salesLead: updatedLead._id,
                                customer: targetCustomerId,
                                salesPerson: salesPersonId,
                                orderStatus: OrderStatus.Canceled,
                                finalStatusThirdFollowUp: ThirdFollowUpStatus.NotPotential,
                                issueDescription: updatedLead.issue || 'Lead marked as not potential',
                                typeOfOrder: '',
                                salesPlatform: '',
                            });
                            console.log('   ✅ Archived SalesOrder created successfully');
                        }
                    }
                }
            } catch (createError) {
                console.error('❌ Error handling Sales Order sync (non-admin path):', createError);
            }
        }

        // If intercepted, response was already sent (202 Accepted)
        if (intercepted) {
            console.log('🔒 Non-admin update intercepted - sent to approval queue');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            return;
        }

        // Admin user: proceed with direct update via service
        console.log('✅ Admin user - proceeding with direct update');

        const lead = await svc.update(String(req.params.id), req.body, userInfo);

        // Log the sales lead update
        await logAction(
            req.user!.userId,
            AuditAction.UPDATE,
            'SalesLead',
            lead._id,
            { leadId: lead._id },
            req,
        );

        sendSuccess(res, { lead }, 'Sales lead updated');
        console.log('✅ Sales lead updated successfully');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (e) {
        next(e);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => { try { await svc.remove(String(req.params.id)); sendSuccess(res, null, 'Sales lead deleted'); } catch (e) { next(e); } };

/**
 * POST /api/sales/leads/bulk-delete
 * Admin-only: Deletes multiple sales leads by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }

        const result = await svc.bulkDelete(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} leads`);
    } catch (e) {
        next(e);
    }
};

