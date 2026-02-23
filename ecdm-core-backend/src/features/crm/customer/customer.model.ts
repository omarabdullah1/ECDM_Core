import mongoose, { Schema, Model } from 'mongoose';
import {
    ICustomerDocument,
    CustomerSector,
    CustomerAgeStatus,
    CustomerStatus,
} from './customer.types';

const customerSchema = new Schema<ICustomerDocument>(
    {
        name: {
            type:      String,
            required:  [true, 'Customer name is required'],
            trim:      true,
            maxlength: [150, 'Name cannot exceed 150 characters'],
        },
        phone: {
            type:     String,
            required: [true, 'Phone number is required'],
            trim:     true,
            unique:   true,
        },
        address: { type: String, trim: true },
        region:  { type: String, trim: true },

        // Market sector (B2B / B2C / B2G)
        sector: {
            type:     String,
            enum:     Object.values(CustomerSector),
            required: [true, 'Sector is required'],
        },

        // Whether this is a new acquisition or a returning customer
        customerAgeStatus: {
            type:    String,
            enum:    Object.values(CustomerAgeStatus),
            default: CustomerAgeStatus.New,
        },

        // CRM lifecycle status
        status: {
            type:    String,
            enum:    Object.values(CustomerStatus),
            default: CustomerStatus.Potential,
        },

        notes: { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    {
        timestamps:  true,
        toJSON:      { virtuals: true },
        toObject:    { virtuals: true },
    },
);

customerSchema.index({ phone:  1 });
customerSchema.index({ status: 1 });
customerSchema.index({ sector: 1 });
customerSchema.index({ name: 'text', notes: 'text' });

const Customer: Model<ICustomerDocument> =
    mongoose.model<ICustomerDocument>('Customer', customerSchema);

export default Customer;
