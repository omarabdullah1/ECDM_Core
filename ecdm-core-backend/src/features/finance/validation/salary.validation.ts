import { z } from 'zod';

const departments = ['Marketing', 'R&D', 'Operation', 'HR', 'Finance', 'Customer Service', 'IT'];

export const createSalarySchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  employeeName: z.string().min(1, 'Employee name is required'),
  department: z.string().min(1, 'Department is required').refine(
    (val) => departments.includes(val),
    { message: 'Invalid department' }
  ),
  basicSalary: z.coerce.number().min(0, 'Basic salary must be zero or greater'),
  allowances: z.coerce.number().min(0, 'Allowances must be zero or greater').optional(),
  overtime: z.coerce.number().min(0, 'Overtime must be zero or greater').optional(),
  bonuses: z.coerce.number().min(0, 'Bonuses must be zero or greater').optional(),
  percentage: z.string().optional(),
  tax: z.coerce.number().min(0, 'Tax must be zero or greater').optional(),
  insurance: z.coerce.number().min(0, 'Insurance must be zero or greater').optional(),
  absenceDeduction: z.coerce.number().min(0, 'Absence deduction must be zero or greater').optional(),
  otherDeductions: z.coerce.number().min(0, 'Other deductions must be zero or greater').optional(),
  notes: z.string().optional(),
});

export const updateSalarySchema = createSalarySchema.partial();
export type CreateSalaryInput = z.infer<typeof createSalarySchema>;
export type UpdateSalaryInput = z.infer<typeof updateSalarySchema>;

