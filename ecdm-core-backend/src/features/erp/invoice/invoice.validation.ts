import { z } from 'zod';
import { InvoiceStatus } from './invoice.types';

const itemSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
});

export const createInvoiceSchema = z.object({
    client: z.string().optional(),
    items: z.array(itemSchema).min(1, 'At least one item is required'),
    tax: z.number().min(0).optional(),
    status: z.nativeEnum(InvoiceStatus).optional(),
    issueDate: z.string().optional(),
    dueDate: z.string().optional(),
    notes: z.string().max(2000).optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

