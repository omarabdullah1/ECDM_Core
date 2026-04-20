import { z } from 'zod';
import { UserRole } from './auth.types';

export const registerSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// Schema for SuperAdmin creating new users/employees
export const createUserSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.nativeEnum(UserRole),
    phone: z.string().optional(),
    isActive: z.boolean().optional().default(true),
    targetBudget: z.number().optional().default(0),
    targetSales: z.number().optional().default(0),
    maxDiscountPercentage: z.number().min(0).max(100).optional().default(0),
    commissionPercentage: z.number().min(0).max(100).optional().default(0),
    department: z.string().optional(),
    salary: z.number().optional().default(0),
});

// Schema for updating user
export const updateUserSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50).optional(),
    lastName: z.string().min(1, 'Last name is required').max(50).optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    role: z.nativeEnum(UserRole).optional(),
    phone: z.string().optional(),
    isActive: z.boolean().optional(),
    targetBudget: z.number().optional(),
    targetSales: z.number().optional(),
    maxDiscountPercentage: z.number().min(0).max(100).optional(),
    commissionPercentage: z.number().min(0).max(100).optional(),
    department: z.string().optional(),
    salary: z.number().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
