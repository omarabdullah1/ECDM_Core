import { Document, Types } from 'mongoose';

// Operational sector the employee works within
export enum EmployeeSector {
    B2B = 'B2B',
    B2C = 'B2C',
    B2G = 'B2G',
}

export enum Department {
    Engineering = 'Engineering',
    Sales = 'Sales',
    Marketing = 'Marketing',
    HR = 'HR',
    Finance = 'Finance',
    Operations = 'Operations',
    Other = 'Other',
}

export enum EmployeeStatus {
    Active = 'Active',
    OnLeave = 'On Leave',
    Terminated = 'Terminated',
}

export interface IEmployee {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    department: Department;
    position: string;
    hireDate?: Date;
    salary?: number;
    status: EmployeeStatus;
    userId?: Types.ObjectId;       // Links to User collection (auth identity)
    jobDescription?: string;       // Free-text HR job description
    sector?: EmployeeSector;       // Operational sector: B2B / B2C / B2G
    createdAt: Date;
    updatedAt: Date;
}

export interface IEmployeeDocument extends IEmployee, Document {
    _id: Types.ObjectId;
    fullName: string;
}
