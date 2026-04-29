import { Document, Types } from 'mongoose';

export enum CustomerSector {
    B2B = 'B2B',
    B2C = 'B2C',
    B2G = 'B2G',
}

export enum CustomerAgeStatus {
    New = 'NEW',
    Old = 'OLD',
}

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

