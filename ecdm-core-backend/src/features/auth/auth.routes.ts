import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate, authorise } from '../../middlewares/auth.middleware';
import { registerSchema, loginSchema } from './auth.validation';
import { UserRole } from './auth.types';

const router = Router();

// Public
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected
router.get('/me', authenticate, authController.getMe);
router.get('/users', authenticate, authorise(UserRole.SuperAdmin, UserRole.Manager), authController.getUsers);

export default router;
