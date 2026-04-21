import { Schema, model, Document } from 'mongoose';
import { getNextSequence } from '../../shared/models/counter.model';

export interface IExpense extends Document {
  sparePartsId?: string;
  expenseId: string;
  expenseDate: Date;
  expenseType: string;
  invoicesUrl?: string;
  invoiceFile?: string;
  description: string;
  amount: number;
  paymentMethod: string;
  paidBy: string;
  employeeId?: Schema.Types.ObjectId;
  source: 'Manual' | 'Salary' | 'Inventory' | 'Other';
  relatedRecordId?: Schema.Types.ObjectId;
  notes?: string;
}

const ExpenseSchema = new Schema<IExpense>({
  sparePartsId: { type: String },
  expenseId: { type: String, unique: true },
  expenseDate: { type: Date, default: Date.now },
  expenseType: { type: String, required: true },
  invoicesUrl: { type: String },
  invoiceFile: { type: String },
  description: { type: String },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  paidBy: { type: String, required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'User' },
  source: { 
    type: String, 
    enum: ['Manual', 'Salary', 'Inventory', 'Other'], 
    default: 'Manual' 
  },
  relatedRecordId: { type: Schema.Types.ObjectId },
  notes: { type: String },
}, {
  timestamps: true,
});

ExpenseSchema.pre('save', async function (next) {
  if (!this.expenseId) {
    const seq = await getNextSequence('expense');
    this.expenseId = `EXP-${seq}`;
  }
  next();
});

export const Expense = model<IExpense>('Expense', ExpenseSchema);