import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/sales-leads.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { interceptUpdate } from '../../../utils/makerChecker';
import { ModuleName } from '../../shared/types/modification-request.types';
import SalesLead from '../models/sales-lead.model';
import { logAction } from '../../../utils/auditLogger';
import { AuditAction } from '../../shared/types/audit-log.types';
import User from '../../auth/auth.model';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { lead: await svc.create(req.body) }, 'Sales lead created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAll(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { lead: await svc.getById(String(req.params.id)) }); } catch (e) { next(e); } };

// PUT update (legacy) - does not auto-track salesPerson
export const update  = async (req: Request, res: Response, next: NextFunction) => { 
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
        const targetRecord = await SalesLead.findById(req.params.id).populate('customerId');
        
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
        // HANDLE CUSTOMER SSOT UPDATES (address, region)
        // These fields are stored in Customer, not SalesLead
        // ═══════════════════════════════════════════════════════════════════
        const { address, region, ...salesLeadData } = req.body;
        
        if (address !== undefined || region !== undefined) {
            const Customer = require('../../shared/models/contact.model').default;
            const customerUpdate: Record<string, unknown> = {};
            if (address !== undefined) customerUpdate.address = address;
            if (region !== undefined) customerUpdate.region = region;
            
            await Customer.findByIdAndUpdate(targetRecord.customerId, customerUpdate, {
                runValidators: true,
            });
            console.log('✅ Customer SSOT fields updated:', Object.keys(customerUpdate).join(', '));
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // HANDLE SALESPERSON AUTO-TRACKING
        // If user is adding work data (issue, order, reason) and salesPerson not set
        // ═══════════════════════════════════════════════════════════════════
        const isAddingWorkData = salesLeadData.issue || salesLeadData.order || salesLeadData.reason;
        if (isAddingWorkData && userInfo && !targetRecord.salesPerson) {
            salesLeadData.salesPerson = userInfo.email || userInfo.name || '';
            console.log('✅ Auto-assigned salesPerson:', salesLeadData.salesPerson);
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
        if (intercepted && salesLeadData.order === 'Yes') {
            try {
                // Re-fetch the updated document to get latest state
                const updatedLead = await SalesLead.findById(req.params.id);
                
                if (updatedLead && updatedLead.order === 'Yes') {
                    // Check if SalesOrder already exists
                    const SalesOrder = require('../models/sales-order.model').default;
                    const existingOrder = await SalesOrder.findOne({ salesLead: updatedLead._id });
                    
                    if (!existingOrder) {
                        console.log(`📦 Auto-creating SalesOrder for Lead ${updatedLead._id} (non-admin update)`);
                        
                        // Map salesPerson to User ObjectId
                        let salesPersonId = null;
                        if (updatedLead.salesPerson) {
                            const user = await User.findOne({
                                $or: [
                                    { email: updatedLead.salesPerson },
                                    { $expr: { $eq: [{ $concat: ['$firstName', ' ', '$lastName'] }, updatedLead.salesPerson] } }
                                ]
                            }).select('_id');
                            if (user) salesPersonId = user._id;
                        }
                        
                        // Extract customer ID safely
                        const targetCustomerId = updatedLead.customerId?._id || updatedLead.customerId;
                        const { OrderStatus } = require('../types/sales-order.types');
                        
                        await SalesOrder.create({
                            salesLead: updatedLead._id,
                            customer: targetCustomerId,
                            salesPerson: salesPersonId,
                            orderStatus: OrderStatus.Pending,
                            issueDescription: updatedLead.issue || 'Order created from Sales Lead',
                            typeOfOrder: '',
                            salesPlatform: '',
                        });
                        
                        console.log(`   ✅ SalesOrder auto-created successfully`);
                    }
                }
            } catch (createError) {
                console.error('❌ FATAL ERROR auto-creating Sales Order (non-admin path):', createError);
                // Don't block the response - it was already sent by interceptUpdate
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

export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.remove(String(req.params.id)); sendSuccess(res, null, 'Sales lead deleted'); } catch (e) { next(e); } };

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
