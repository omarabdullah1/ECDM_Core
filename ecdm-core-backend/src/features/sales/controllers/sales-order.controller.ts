import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/sales-order.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { order: await svc.create(req.body) }, 'Sales order created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAll(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { order: await svc.getById(String(req.params.id)) }); } catch (e) { next(e); } };

/**
 * PATCH/PUT /api/sales/orders/:id
 * Update Sales Order with optional file upload support
 * 
 * This controller handles multipart/form-data requests with:
 * - Text fields via req.body (automatically parsed by multer)
 * - File upload via req.file (processed by uploadQuotation middleware)
 * - File URL injection via handleQuotationUpload middleware
 */
export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 SALES ORDER UPDATE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Order ID:', req.params.id);
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
        
        // Update the sales order (req.body already contains quotationFileUrl from middleware)
        const updatedOrder = await svc.update(String(req.params.id), req.body);
        
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

export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.remove(String(req.params.id)); sendSuccess(res, null, 'Sales order deleted'); } catch (e) { next(e); } };

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
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} orders`);
    } catch (e) {
        next(e);
    }
};
