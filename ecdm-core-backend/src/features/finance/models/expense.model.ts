import { Schema, model, Document } from 'mongoose';

export interface IExpense extends Document {
  sparePartsId?: string;
  expenseId: string;
  expenseDate: Date;
  expenseType: string;
  invoicesUrl?: string;
  description: string;
  amount: number;
  paymentMethod: string;
  paidBy: string;
  notes?: string;
}

const ExpenseSchema = new Schema<IExpense>({
  sparePartsId: { type: String },
  expenseId: { type: String, required: true, unique: true },
  expenseDate: { type: Date, default: Date.now },
  expenseType: { type: String, required: true },
  invoicesUrl: { type: String },
  description: { type: String },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  paidBy: { type: String, required: true },
  notes: { type: String },
}, {
  timestamps: true,
});

export const Expense = model<IExpense>('Expense', ExpenseSchema);