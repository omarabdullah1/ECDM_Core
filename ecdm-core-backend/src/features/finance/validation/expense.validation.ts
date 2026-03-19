import { z } from 'zod';

export const createExpenseSchema = z.object({
    sparePartsId:   z.string().optional(),
    expenseId:      z.string().min(1, 'Expense ID is required'),
    expenseDate:    z.string().min(1, 'Expense date is required').refine(
        (val) => !isNaN(Date.parse(val)),
        { message: 'Invalid date format' }
    ),
    expenseType:    z.string().min(1, 'Expense type is required'),
    invoicesUrl:    z.string().optional(),
    description:    z.string().min(1, 'Description is required'),
    amount:         z.coerce.number().min(0, 'Amount must be zero or greater').optional(),
    paymentMethod:  z.string().min(1, 'Payment method is required'),
    paidBy:         z.string().min(1, 'Paid by is required'),
    notes:          z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();
export type CreateExpenseInput  = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput  = z.infer<typeof updateExpenseSchema>;
