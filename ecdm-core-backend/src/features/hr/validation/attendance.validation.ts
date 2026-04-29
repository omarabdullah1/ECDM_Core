import { z } from 'zod';

// ── Create Attendance Schema ────────────────────────────────────────
export const createAttendanceSchema = z.object({
    body: z.object({
        employeeId: z.string().min(1, 'Employee ID is required'),
        userId: z.string().optional(),
        name: z.string().min(1, 'Name is required'),
        department: z.string().optional().default(''),
        date: z.string().or(z.date()),
        day: z.string().optional().default(''),
        checkIn: z.string().optional().default(''),
        checkOut: z.string().optional().default(''),
        status: z.enum(['Present', 'Absent', 'Late', 'Half-day', 'Leave', '']).optional().default(''),
        notes: z.string().max(500).optional().default(''),
    }),
});

// ── Update Attendance Schema ────────────────────────────────────────
export const updateAttendanceSchema = z.object({
    body: z.object({
        employeeId: z.string().min(1).optional(),
        userId: z.string().optional(),
        name: z.string().min(1).optional(),
        department: z.string().optional(),
        date: z.string().or(z.date()).optional(),
        day: z.string().optional(),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        status: z.enum(['Present', 'Absent', 'Late', 'Half-day', 'Leave', '']).optional(),
        notes: z.string().max(500).optional(),
    }),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>['body'];
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>['body'];

