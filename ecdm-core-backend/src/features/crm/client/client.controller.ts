import { Request, Response, NextFunction } from 'express';
import * as clientService from './client.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { parsePagination, buildPaginatedResult } from '../../../utils/pagination';

// ── POST /api/crm/clients ───────────────────────────────────────────
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const client = await clientService.createClient(req.body);
        sendSuccess(res, { client }, 'Client created successfully', 201);
    } catch (err) {
        next(err);
    }
};

// ── GET /api/crm/clients ────────────────────────────────────────────
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { page, limit, skip } = parsePagination(req.query as Record<string, string>);
        const { clients, total } = await clientService.getAllClients(req.query, skip, limit);
        const result = buildPaginatedResult(clients, total, { page, limit, skip });
        sendSuccess(res, result, 'Clients retrieved');
    } catch (err) {
        next(err);
    }
};

// ── GET /api/crm/clients/:id ────────────────────────────────────────
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const client = await clientService.getClientById(req.params.id as string);
        sendSuccess(res, { client }, 'Client retrieved');
    } catch (err) {
        next(err);
    }
};

// ── PUT /api/crm/clients/:id ────────────────────────────────────────
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const client = await clientService.updateClient(req.params.id as string, req.body);
        sendSuccess(res, { client }, 'Client updated successfully');
    } catch (err) {
        next(err);
    }
};

// ── DELETE /api/crm/clients/:id ─────────────────────────────────────
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await clientService.deleteClient(req.params.id as string);
        sendSuccess(res, null, 'Client deleted successfully');
    } catch (err) {
        next(err);
    }
};
