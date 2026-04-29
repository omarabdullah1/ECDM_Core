import { Router } from 'express';
import * as taskController from './task.controller';
import { validate } from '../../../middlewares/validate.middleware';
import { authenticate, authorise, isAdmin } from '../../../middlewares/auth.middleware';
import { createTaskSchema, updateTaskSchema } from './task.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();

// All task routes require authentication
router.use(authenticate);

router.post('/', validate(createTaskSchema), taskController.create);
router.get('/', taskController.getAll);
router.get('/:id', taskController.getById);
router.put('/:id', validate(updateTaskSchema), taskController.update);
router.delete(
    '/:id',
    authorise(UserRole.SuperAdmin, UserRole.Admin),
    taskController.remove,
);
router.post('/bulk-delete', isAdmin, taskController.bulkDelete);  // Admin-only bulk delete

export default router;

