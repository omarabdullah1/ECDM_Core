import { Document, Types } from 'mongoose';

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
    userId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IEmployeeDocument extends IEmployee, Document {
    _id: Types.ObjectId;
    fullName: string;
}
