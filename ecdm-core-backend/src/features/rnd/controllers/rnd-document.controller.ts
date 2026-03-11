import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/rnd-document.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { logAction } from '../../../utils/auditLogger';
import { AuditAction } from '../../shared/types/audit-log.types';

// ── R&D Document Controllers ────────────────────────────────────────
export const createDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const document = await svc.createDocument(req.body);
        
        await logAction(
            req.user!.userId,
            AuditAction.CREATE,
            'RndDocument',
            document._id,
            { documentId: document._id, fileName: document.fileName },
            req,
        );
        
        sendSuccess(res, { document }, 'Document uploaded successfully', 201);
    } catch (e) {
        next(e);
    }
};

export const getDocumentsByProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.query;
        if (!projectId) {
            res.status(400).json({ success: false, message: 'Project ID is required' });
            return;
        }
        const documents = await svc.getDocumentsByProject(String(projectId));
        sendSuccess(res, { documents });
    } catch (e) {
        next(e);
    }
};

export const getDocumentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { document: await svc.getDocumentById(String(req.params.id)) });
    } catch (e) {
        next(e);
    }
};

export const updateDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const document = await svc.updateDocument(String(req.params.id), req.body);
        
        await logAction(
            req.user!.userId,
            AuditAction.UPDATE,
            'RndDocument',
            document._id.toString(),
            { documentId: document._id, changes: req.body },
            req,
        );
        
        sendSuccess(res, { document }, 'Document updated successfully');
    } catch (e) {
        next(e);
    }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.deleteDocument(String(req.params.id), req.user!.userId);
        
        await logAction(
            req.user!.userId,
            AuditAction.DELETE,
            'RndDocument',
            String(req.params.id),
            { documentId: String(req.params.id) },
            req,
        );
        
        sendSuccess(res, null, 'Document deleted successfully');
    } catch (e) {
        next(e);
    }
};
