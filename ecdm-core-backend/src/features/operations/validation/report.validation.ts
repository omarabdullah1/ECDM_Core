import { z } from 'zod';

const evaluationPeriodSchema = z.object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate:   z.string().min(1, 'End date is required'),
});

export const createReportSchema = z.object({
    employee:                z.string().min(1, 'Employee (user) ID is required'),
    evaluationPeriod:        evaluationPeriodSchema,
    punctualityScore:        z.number().min(0).max(100),
    taskCompletedCount:      z.number().int().min(0),
    taskReturnedCount:       z.number().int().min(0),
    completionRate:          z.number().min(0).max(100),
    returnRate:              z.number().min(0).max(100),
    taskQualityScore:        z.number().min(0).max(5),
    overallPerformanceScore: z.number().min(0).max(100).optional(),
    notes:                   z.string().optional(),
});

export const updateReportSchema = createReportSchema.partial();
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;

