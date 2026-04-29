import mongoose, { Schema, Model } from 'mongoose';
import { ICustomerDocument, CustomerType, CustomerSector } from '../types/contact.types';
import { getNextSequence } from './counter.model';

/**
 * Customer Schema - Single Source of Truth (SSOT)
 * 
 * This is the central entity for all person/company data in ECDM Core.
 * All modules (Marketing, Sales, Operations, Customer) reference this entity.
 * 
 * Phone number is the UNIQUE identifier used for deduplication across the system.
 * customerId is the human-readable global identifier (e.g., CUS-1001).
 */
const customerSchema = new Schema<ICustomerDocument>(
    {
        customerId: {
            type:   String,
            unique: true,
            sparse: true,
        },
        phone: {
            type:     String,
            required: [true, 'Phone number is required'],
            unique:   true,
            trim:     true,
        },
        name: {
            type:      String,
            required:  [true, 'Name is required'],
            trim:      true,
            maxlength: [150, 'Name cannot exceed 150 characters'],
        },
        type: {
            type:    String,
            enum:    Object.values(CustomerType),
            default: CustomerType.Other,
        },
        sector: {
            type:    String,
            enum:    Object.values(CustomerSector),
            default: CustomerSector.Other,
        },
        email: {
            type:      String,
            trim:      true,
            lowercase: true,
        },
        company: {
            type:      String,
            trim:      true,
            maxlength: [200, 'Company name cannot exceed 200 characters'],
        },
        address: {
            type:      String,
            trim:      true,
            maxlength: [500, 'Address cannot exceed 500 characters'],
        },
        region: {
            type: String,
            trim: true,
        },
        notes: {
            type:      String,
            maxlength: [2000, 'Notes cannot exceed 2000 characters'],
        },
        csPerson: {
            type:    String,
            default: '',
        },
    },
    {
        timestamps: true,
        toJSON:   { virtuals: true },
        toObject: { virtuals: true },
    },
);

// Pre-save hook to generate customerId (CUS-1001)
customerSchema.pre('save', async function (next) {
    if (!this.customerId) {
        const seq = await getNextSequence('customer');
        this.customerId = `CUS-${seq}`;
    }
    next();
});

// Indexes for common queries
customerSchema.index({ name:   1 });
customerSchema.index({ type:   1 });
customerSchema.index({ sector: 1 });
customerSchema.index({ name: 'text', phone: 'text', company: 'text' });

const Customer: Model<ICustomerDocument> = mongoose.model<ICustomerDocument>('Customer', customerSchema);

// Export as both Customer and Contact for backward compatibility
export default Customer;
export { Customer as Contact };

