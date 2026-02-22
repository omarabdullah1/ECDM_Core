import { Document, Types } from 'mongoose';

export enum LeadSource {
    Web = 'Web',
    Referral = 'Referral',
    ColdCall = 'Cold Call',
    Social = 'Social',
    Other = 'Other',
}

export enum LeadStatus {
    New = 'New',
    Contacted = 'Contacted',
    Qualified = 'Qualified',
    Proposal = 'Proposal',
    Won = 'Won',
    Lost = 'Lost',
}

export interface ILead {
    title: string;
    contactName: string;
    email?: string;
    phone?: string;
    company?: string;
    source: LeadSource;
    status: LeadStatus;
    value?: number;
    assignedTo?: Types.ObjectId;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ILeadDocument extends ILead, Document {
    _id: Types.ObjectId;
}
