import { Document, Types } from 'mongoose';

// Which market sector this customer belongs to
export enum CustomerSector {
    B2B = 'B2B', // Business-to-Business
    B2C = 'B2C', // Business-to-Consumer
    B2G = 'B2G', // Business-to-Government
}

// Whether this is a newly acquired or returning customer
export enum CustomerAgeStatus {
    New = 'NEW',
    Old = 'OLD',
}

// CRM lifecycle status of the customer
export enum CustomerStatus {
    Active    = 'Active',
    Inactive  = 'Inactive',
    Potential = 'Potential',
    VIP       = 'VIP',
    Closed    = 'Closed',
}

export interface ICustomer {
    name:              string;
    phone:             string;
    address?:          string;
    region?:           string;
    sector:            CustomerSector;
    customerAgeStatus: CustomerAgeStatus;
    status:            CustomerStatus;
    notes?:            string;
    createdAt:         Date;
    updatedAt:         Date;
}

export interface ICustomerDocument extends ICustomer, Document {
    _id: Types.ObjectId;
}
