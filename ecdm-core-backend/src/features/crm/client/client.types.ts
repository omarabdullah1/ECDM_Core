import { Document, Types } from 'mongoose';

// ── Client status ───────────────────────────────────────────────────
export enum ClientStatus {
    Active = 'Active',
    Inactive = 'Inactive',
    Prospect = 'Prospect',
    Churned = 'Churned',
}

// ── Contact person (embedded sub-document) ──────────────────────────
export interface IContactPerson {
    name: string;
    email?: string;
    phone?: string;
    position?: string;
    isPrimary: boolean;
}

// ── Address ─────────────────────────────────────────────────────────
export interface IAddress {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
}

// ── Base interface ──────────────────────────────────────────────────
export interface IClient {
    companyName: string;
    industry?: string;
    website?: string;
    email: string;
    phone?: string;
    address: IAddress;
    contactPersons: IContactPerson[];
    status: ClientStatus;
    assignedTo: Types.ObjectId;   // ref → User
    notes?: string;
    tags?: string[];
    annualRevenue?: number;
    createdAt: Date;
    updatedAt: Date;
}

// ── Mongoose document interface ─────────────────────────────────────
export interface IClientDocument extends IClient, Document {
    _id: Types.ObjectId;
}
