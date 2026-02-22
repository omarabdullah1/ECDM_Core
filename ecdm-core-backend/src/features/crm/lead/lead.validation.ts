import { z } from 'zod';
import { LeadSource, LeadStatus } from './lead.types';

export const createLeadSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    contactName: z.string().min(1, 'Contact name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    company: z.string().optional(),
    source: z.nativeEnum(LeadSource).optional(),
    status: z.nativeEnum(LeadStatus).optional(),
    value: z.number().min(0).optional(),
    assignedTo: z.string().optional(),
    notes: z.string().max(2000).optional(),
});

export const updateLeadSchema = createLeadSchema.partial();
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
