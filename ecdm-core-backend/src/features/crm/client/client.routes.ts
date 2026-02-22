import { Router } from 'express';
import * as clientController from './client.controller';
import { validate } from '../../../middlewares/validate.middleware';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { createClientSchema, updateClientSchema } from './client.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();

// All client routes require authentication
router.use(authenticate);

router.post('/', validate(createClientSchema), clientController.create);
router.get('/', clientController.getAll);
router.get('/:id', clientController.getById);
router.put('/:id', validate(updateClientSchema), clientController.update);
router.delete(
    '/:id',
    authorise(UserRole.SuperAdmin, UserRole.Manager),
    clientController.remove,
);

export default router;
