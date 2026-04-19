import { z } from 'zod';

export const createInvoiceSchema = z.object({
    customerId:   z.string().min(1, 'Customer ID is required'),
    salesOrderId: z.string().optional(),
    items: z.array(z.object({
        description:     z.string().min(1, 'Description is required'),
        quantity:        z.number().min(1, 'Quantity must be at least 1'),
        unitPrice:       z.number().min(0, 'Unit price must be positive'),
        inventoryItemId: z.string().optional(),
    })).min(1, 'At least one item is required'),
    tax:   z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
});

export const updateInvoiceSchema = z.object({
    items: z.array(z.object({
        description:     z.string().min(1, 'Description is required'),
        quantity:        z.number().min(1, 'Quantity must be at least 1'),
        unitPrice:       z.number().min(0, 'Unit price must be positive'),
        inventoryItemId: z.string().optional(),
    })).min(1, 'At least one item is required').optional(),
    tax:   z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
    status: z.enum(['Pending', 'Paid', 'Unpaid', 'Canceled']).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
