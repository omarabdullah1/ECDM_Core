import { Schema, model, Document } from 'mongoose';

export interface IInventoryFinance extends Document {
  sparePartsId: string;
  itemName: string;
  price: number;
  typeOfOrder: string;
  stockNumber: number;
  status: string;
  purchaseOrdersUrl: string;
  startDate: Date;
  suppliersId: string;
  address: string;
  phone: string;
  endDate: Date;
  notes: string;
}

const InventoryFinanceSchema = new Schema<IInventoryFinance>({
  sparePartsId: { type: String, required: true },
  itemName: { type: String, required: true },
  price: { type: Number, required: true },
  typeOfOrder: { type: String, required: true },
  stockNumber: { type: Number, required: true },
  status: {
    type: String,
    enum: ['In stock', 'Temporarily unavailable', 'Repurchase needed', 'Sold out'],
    default: 'In stock',
  },
  purchaseOrdersUrl: { type: String },
  startDate: { type: Date },
  suppliersId: { type: String },
  address: { type: String },
  phone: { type: String },
  endDate: { type: Date },
  notes: { type: String },
}, {
  timestamps: true,
});

export const InventoryFinance = model<IInventoryFinance>('InventoryFinance', InventoryFinanceSchema);

