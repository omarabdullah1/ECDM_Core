import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/rnd.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { logAction } from '../../../utils/auditLogger';
import { AuditAction } from '../../shared/types/audit-log.types';

// ── R&D Project Controllers ─────────────────────────────────────────
export const createProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const project = await svc.createProject(req.body);
        
        await logAction(
            req.user!.userId,
            AuditAction.CREATE,
            'RndProject',
            project._id,
            { projectId: project._id, title: project.title },
            req,
        );
        
        sendSuccess(res, { project }, 'R&D project created successfully', 201);
    } catch (e) {
        next(e);
    }
};

export const getAllProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getAllProjects(req.query));
    } catch (e) {
        next(e);
    }
};

export const getProjectById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { project: await svc.getProjectById(String(req.params.id)) });
    } catch (e) {
        next(e);
    }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const project = await svc.updateProject(String(req.params.id), req.body);
        
        await logAction(
            req.user!.userId,
            AuditAction.UPDATE,
            'RndProject',
            project._id.toString(),
            { projectId: project._id, changes: req.body },
            req,
        );
        
        sendSuccess(res, { project }, 'Project updated successfully');
    } catch (e) {
        next(e);
    }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.deleteProject(String(req.params.id));
        
        await logAction(
            req.user!.userId,
            AuditAction.DELETE,
            'RndProject',
            String(req.params.id),
            { projectId: String(req.params.id) },
            req,
        );
        
        sendSuccess(res, null, 'Project deleted successfully');
    } catch (e) {
        next(e);
    }
};

// ── R&D Task Controllers ────────────────────────────────────────────
export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const task = await svc.createTask(req.body);
        
        await logAction(
            req.user!.userId,
            AuditAction.CREATE,
            'RndTask',
            task._id,
            { taskId: task._id, title: task.title, type: task.type },
            req,
        );
        
        sendSuccess(res, { task }, 'Task created successfully', 201);
    } catch (e) {
        next(e);
    }
};

export const getAllTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getAllTasks(req.query));
    } catch (e) {
        next(e);
    }
};

export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { task: await svc.getTaskById(String(req.params.id)) });
    } catch (e) {
        next(e);
    }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const task = await svc.updateTask(String(req.params.id), req.body);
        
        await logAction(
            req.user!.userId,
            AuditAction.UPDATE,
            'RndTask',
            task._id.toString(),
            { taskId: task._id, changes: req.body },
            req,
        );
        
        sendSuccess(res, { task }, 'Task updated successfully');
    } catch (e) {
        next(e);
    }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.deleteTask(String(req.params.id));
        
        await logAction(
            req.user!.userId,
            AuditAction.DELETE,
            'RndTask',
            String(req.params.id),
            { taskId: String(req.params.id) },
            req,
        );
        
        sendSuccess(res, null, 'Task deleted successfully');
    } catch (e) {
        next(e);
    }
};
