import { z } from 'zod';
import { ModificationRequestStatus, ModuleName } from '../types/modification-request.types';

// ── Create Modification Request Schema ──────────────────────────────
export const createModificationRequestSchema = z.object({
    moduleName: z.nativeEnum(ModuleName, {
        errorMap: () => ({ message: 'Invalid module name' }),
    }),
    recordId: z.string().min(1, 'Record ID is required'),
    originalData: z.record(z.unknown()),
    proposedData: z.record(z.unknown()),
});

// ── Review Request Schema ───────────────────────────────────────────
export const reviewRequestSchema = z.object({
    status: z.enum(['Approved', 'Rejected'], {
        errorMap: () => ({ message: 'Status must be either Approved or Rejected' }),
    }),
    reviewNotes: z.string().max(1000, 'Review notes cannot exceed 1000 characters').optional(),
});

// ── Query Parameters Schema ─────────────────────────────────────────
export const queryModificationRequestsSchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    status: z.nativeEnum(ModificationRequestStatus).optional(),
    moduleName: z.nativeEnum(ModuleName).optional(),
});

// ── Type exports ────────────────────────────────────────────────────
export type CreateModificationRequestInput = z.infer<typeof createModificationRequestSchema>;
export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>;
export type QueryModificationRequestsInput = z.infer<typeof queryModificationRequestsSchema>;
