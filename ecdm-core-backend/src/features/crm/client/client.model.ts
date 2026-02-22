import mongoose, { Schema, Model } from 'mongoose';
import { IClientDocument, ClientStatus } from './client.types';

// ── Sub-schemas ─────────────────────────────────────────────────────
const contactPersonSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        position: { type: String, trim: true },
        isPrimary: { type: Boolean, default: false },
    },
    { _id: true },
);

const addressSchema = new Schema(
    {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true },
        zipCode: { type: String, trim: true },
    },
    { _id: false },
);

// ── Client schema ───────────────────────────────────────────────────
const clientSchema = new Schema<IClientDocument>(
    {
        companyName: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
            maxlength: [150, 'Company name cannot exceed 150 characters'],
        },
        industry: {
            type: String,
            trim: true,
        },
        website: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            type: addressSchema,
            default: () => ({}),
        },
        contactPersons: {
            type: [contactPersonSchema],
            default: [],
        },
        status: {
            type: String,
            enum: Object.values(ClientStatus),
            default: ClientStatus.Prospect,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
        },
        notes: {
            type: String,
            maxlength: [2000, 'Notes cannot exceed 2000 characters'],
        },
        tags: {
            type: [String],
            default: [],
        },
        annualRevenue: {
            type: Number,
            min: [0, 'Annual revenue cannot be negative'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// ── Indexes ─────────────────────────────────────────────────────────
clientSchema.index({ companyName: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ assignedTo: 1 });
clientSchema.index({ companyName: 'text', notes: 'text' }); // full-text search

// ── Model ───────────────────────────────────────────────────────────
const Client: Model<IClientDocument> = mongoose.model<IClientDocument>('Client', clientSchema);

export default Client;
