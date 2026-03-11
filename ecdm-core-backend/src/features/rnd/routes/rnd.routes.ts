import { Router } from 'express';
import * as ctrl from '../controllers/rnd.controller';
import * as docCtrl from '../controllers/rnd-document.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createProjectSchema, updateProjectSchema, createTaskSchema, updateTaskSchema } from '../validation/rnd.validation';
import { createDocumentSchema, updateDocumentSchema } from '../validation/rnd-document.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

// ── R&D Project Routes ──────────────────────────────────────────────
router.post('/projects',           validate(createProjectSchema), ctrl.createProject);
router.get('/projects',            ctrl.getAllProjects);
router.get('/projects/:id',        ctrl.getProjectById);
router.put('/projects/:id',        validate(updateProjectSchema), ctrl.updateProject);
router.patch('/projects/:id',      validate(updateProjectSchema), ctrl.updateProject);
router.delete('/projects/:id',     authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), ctrl.deleteProject);

// ── R&D Task Routes ─────────────────────────────────────────────────
router.post('/tasks',              validate(createTaskSchema), ctrl.createTask);
router.get('/tasks',               ctrl.getAllTasks);
router.get('/tasks/:id',           ctrl.getTaskById);
router.put('/tasks/:id',           validate(updateTaskSchema), ctrl.updateTask);
router.patch('/tasks/:id',         validate(updateTaskSchema), ctrl.updateTask);
router.delete('/tasks/:id',        ctrl.deleteTask); // Allow authenticated users to delete tasks

// ── R&D Document Routes ─────────────────────────────────────────────
router.post('/documents',          validate(createDocumentSchema), docCtrl.createDocument);
router.get('/documents',           docCtrl.getDocumentsByProject); // Requires ?projectId=xxx
router.get('/documents/:id',       docCtrl.getDocumentById);
router.patch('/documents/:id',     validate(updateDocumentSchema), docCtrl.updateDocument);
router.delete('/documents/:id',    docCtrl.deleteDocument); // Creator only (enforced in service)

export default router;
