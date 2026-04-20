import { Request, Response, NextFunction } from 'express';
import * as invoiceService from '../services/invoice.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { AppError } from '../../../utils/apiError';

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await invoiceService.createInvoice(req.body);
        sendSuccess(res, data, 'Invoice created successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await invoiceService.getInvoices(req.query);
        sendSuccess(res, data, 'Invoices fetched successfully');
    } catch (err) {
        next(err);
    }
};

export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await invoiceService.getInvoiceById(req.params.id);
        sendSuccess(res, data, 'Invoice fetched successfully');
    } catch (err) {
        next(err);
    }
};

export const updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await invoiceService.updateInvoice(req.params.id, req.body);
        sendSuccess(res, data, 'Invoice updated successfully');
    } catch (err) {
        next(err);
    }
};

export const approveInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.userId; // Fixed userId extraction
        const role = (req as any).user?.role;
        const { status } = req.body;

        if (!status) {
            throw new AppError('Status is required', 400);
        }

        // AUTH CHECK: only Admin, SuperAdmin, and Manager can change status
        const authorizedRoles = ['Admin', 'SuperAdmin', 'Manager'];
        if (!authorizedRoles.includes(role)) {
            throw new AppError('Only authorized personnel can modify invoice status', 403);
        }

        const data = await invoiceService.updateInvoiceStatus(req.params.id, status, userId);
        sendSuccess(res, data, `Invoice status updated to ${status} successfully`);
    } catch (err) {
        next(err);
    }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await invoiceService.deleteInvoice(req.params.id);
        sendSuccess(res, null, 'Invoice deleted successfully');
    } catch (err) {
        next(err);
    }
};

export const generateFromOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderFinanceId } = req.body;
        if (!orderFinanceId) {
            throw new AppError('orderFinanceId is required', 400);
        }
        const data = await invoiceService.generateFromOrder(orderFinanceId);
        sendSuccess(res, data, 'Invoice generated from order successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const addPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.userId;
        const role = (req as any).user?.role;
        const { id } = req.params;

        // AUTH CHECK: only Admin, SuperAdmin, and Manager can record payments
        const authorizedRoles = ['Admin', 'SuperAdmin', 'Manager', 'Finance'];
        if (!authorizedRoles.includes(role)) {
            throw new AppError('Only authorized personnel can record payments', 403);
        }

        const data = await invoiceService.addPaymentToInvoice(id, req.body, userId);
        sendSuccess(res, data, 'Payment recorded successfully');
    } catch (err) {
        next(err);
    }
};
