import { z } from 'zod';
import { Department, EmployeeStatus } from '../types/employee.types';

export const createEmployeeSchema = z.object({
    firstName:      z.string().min(1, 'First name is required'),
    lastName:       z.string().min(1, 'Last name is required'),
    email:          z.string().email('Invalid email'),
    phone:          z.string().optional(),
    department:     z.nativeEnum(Department),
    position:       z.string().min(1, 'Position is required'),
    hireDate:       z.string().optional(),
    salary:         z.number().min(0).optional(),
    status:         z.nativeEnum(EmployeeStatus).optional(),
    userId:         z.string().optional(),
    jobDescription: z.string().optional(),
    sector:         z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

