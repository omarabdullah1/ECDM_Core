import { z } from 'zod';

export const createExpenseSchema = z.object({
    sparePartsId:   z.string().optional(),
    expenseId:      z.string().optional(), // Now auto-generated
    expenseDate:    z.string().optional(), // Defaults to Date.now
    expenseType:    z.string().min(1, 'Expense type is required'),
    invoicesUrl:    z.string().optional(),
    invoiceFile:    z.string().optional(), // Populated by middleware
    description:    z.string().min(1, 'Description is required'),
    amount:         z.coerce.number().min(0, 'Amount must be zero or greater'),
    paymentMethod:  z.string().min(1, 'Payment method is required'),
    paidBy:         z.string().min(1, 'Paid by is required'),
    employeeId:     z.string().optional(),
    source:         z.enum(['Manual', 'Salary', 'Inventory', 'Other']).optional(),
    notes:          z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();
export type CreateExpenseInput  = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput  = z.infer<typeof updateExpenseSchema>;

