import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as ctrl from './dashboard.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', ctrl.getStats);
router.get('/summary', ctrl.getSummary);

export default router;
