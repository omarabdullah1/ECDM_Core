import { Router } from 'express';
import { authenticate, authorise } from '../../middlewares/auth.middleware';
import * as ctrl from './dashboard.controller';
import { UserRole } from '../auth/auth.types';

const router = Router();
router.use(authenticate);
router.use(authorise(UserRole.SuperAdmin, UserRole.Admin, UserRole.Manager));

router.get('/stats', ctrl.getStats);
router.get('/summary', ctrl.getSummary);

export default router;

