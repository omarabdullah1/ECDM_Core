import { z } from 'zod';

// ── R&D Document Validation ────────────────────────────────────────
export const createDocumentSchema = z.object({
    fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
    fileUrl: z.string().url('Invalid file URL').min(1, 'File URL is required'),
    fileType: z.string().min(1, 'File type is required').max(100, 'File type too long'),
    projectId: z.string().min(1, 'Project ID is required'),
    uploadedBy: z.string().min(1, 'Uploader ID is required'),
});

export const updateDocumentSchema = z.object({
    fileName: z.string().min(1).max(255).optional(),
    fileUrl: z.string().url().optional(),
    fileType: z.string().min(1).max(100).optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

