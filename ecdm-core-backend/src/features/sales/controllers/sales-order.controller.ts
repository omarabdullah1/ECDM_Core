import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/sales-order.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { interceptUpdate } from '../../../utils/makerChecker';
import { ModuleName } from '../../shared/types/modification-request.types';
import SalesOrder from '../models/sales-order.model';
import { logAction } from '../../../utils/auditLogger';
import { AuditAction } from '../../shared/types/audit-log.types';

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const order = await svc.create(req.body);
        
        // Log the sales order creation
        await logAction(
            req.user!.userId,
            AuditAction.CREATE,
            'SalesOrder',
            order._id,
            { orderId: order._id },
            req,
        );
        
        sendSuccess(res, { order }, 'Sales order created', 201);
    } catch (e) {
        next(e);
    }
};
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAll(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { order: await svc.getById(String(req.params.id)) }); } catch (e) { next(e); } };

/**
 * PATCH/PUT /api/sales/orders/:id
 * Update Sales Order with optional file upload support
 * 
 * MAKER-CHECKER: Non-admin users will have their updates routed through
 * the approval workflow. Only SuperAdmin/Manager can update directly.
 * 
 * This controller handles multipart/form-data requests with:
 * - Text fields via req.body (automatically parsed by multer)
 * - File upload via req.file (processed by uploadQuotation middleware)
 * - File URL injection via handleQuotationUpload middleware
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 SALES ORDER UPDATE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Order ID:', req.params.id);
        console.log('User Role:', req.user?.role);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Has File Upload:', !!req.file);
        
        if (req.file) {
            console.log('📎 File Details:');
            console.log('  - Original Name:', req.file.originalname);
            console.log('  - Saved As:', req.file.filename);
            console.log('  - Size:', `${(req.file.size / 1024).toFixed(2)} KB`);
            console.log('  - Type:', req.file.mimetype);
            console.log('  - URL:', req.body.quotationFileUrl);
        }
        
        console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
        
        // ═══════════════════════════════════════════════════════════════════
        // MAKER-CHECKER INTERCEPTOR
        // Non-admin users submit changes for approval instead of direct update
        // ═══════════════════════════════════════════════════════════════════
        const targetRecord = await SalesOrder.findById(req.params.id);
        
        if (!targetRecord) {
            sendSuccess(res, null, 'Sales order not found', 404);
            return;
        }
        
        const intercepted = await interceptUpdate(
            req,
            res,
            ModuleName.SalesOrder,
            targetRecord,
            req.body
        );
        
        // If intercepted, response was already sent (202 Accepted)
        if (intercepted) {
            console.log('🔒 Non-admin update intercepted - sent to approval queue');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            return;
        }
        
        // Admin user: proceed with direct update
        console.log('✅ Admin user - proceeding with direct update');
        
        // Update the sales order (req.body already contains quotationFileUrl from middleware)
        const updatedOrder = await svc.update(String(req.params.id), req.body);
        
        // Log the sales order update
        await logAction(
            req.user!.userId,
            AuditAction.UPDATE,
            'SalesOrder',
            updatedOrder._id,
            { updatedFields: Object.keys(req.body) },
            req,
        );
        
        console.log('✅ Sales order updated successfully');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        sendSuccess(res, { order: updatedOrder }, 'Sales order updated');
    } catch (e: unknown) {
        console.error('❌ SALES ORDER UPDATE ERROR:');
        console.error('Order ID:', req.params.id);
        console.error('Error:', e);
        console.error('Stack:', (e as Error).stack);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        next(e);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.remove(String(req.params.id));
        
        // Log the sales order deletion
        await logAction(
            req.user!.userId,
            AuditAction.DELETE,
            'SalesOrder',
            String(req.params.id),
            { deletedOrderId: req.params.id },
            req,
        );
        
        sendSuccess(res, null, 'Sales order deleted');
    } catch (e) {
        next(e);
    }
};

/**
 * POST /api/sales/orders/bulk-delete
 * Admin-only: Deletes multiple sales orders by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        
        const result = await svc.bulkDelete(ids);
        
        // Log the bulk deletion action
        await logAction(
            req.user!.userId,
            AuditAction.DELETE,
            'SalesOrder',
            undefined,
            { bulkDelete: true, deletedCount: result.deletedCount, deletedIds: ids },
            req,
        );
        
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} orders`);
    } catch (e) {
        next(e);
    }
};
