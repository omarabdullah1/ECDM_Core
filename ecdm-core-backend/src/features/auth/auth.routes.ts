import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate, authorise } from '../../middlewares/auth.middleware';
import { registerSchema, loginSchema, createUserSchema, updateUserSchema } from './auth.validation';
import { UserRole } from './auth.types';

const router = Router();

// Public
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

// Protected
router.get('/me', authenticate, authController.getMe);

// User Management (SuperAdmin only)
router.get('/users', authenticate, authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), authController.getUsers);
router.post('/users', authenticate, authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), validate(createUserSchema), authController.createUser);
router.get('/users/:id', authenticate, authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), authController.getUser);
router.put('/users/:id', authenticate, authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), validate(updateUserSchema), authController.updateUser);
router.delete('/users/:id', authenticate, authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), authController.deleteUser);

export default router;
