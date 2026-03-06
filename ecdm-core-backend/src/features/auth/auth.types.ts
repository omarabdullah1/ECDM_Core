import { Document, Types } from 'mongoose';

// ── User roles (RBAC) ──────────────────────────────────────────────
export enum UserRole {
    SuperAdmin = 'SuperAdmin',
    Manager = 'Manager',
    Sales = 'Sales',
    Operations = 'Operations',
    Maintenance = 'Maintenance',
    HR = 'HR',
    MaintenanceEngineer = 'MaintenanceEngineer',
    Technician = 'Technician',
    CustomerService = 'CustomerService',
}

// ── HR Document type for employee profile ──────────────────────────
export interface IEmployeeDocument {
    title: string;
    fileUrl: string;
    uploadedAt: Date;
}

// ── Base interface (plain data shape) ───────────────────────────────
export interface IUser {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    lastLogin?: Date;
    avatar?: string;
    avatarUrl?: string;              // HR: Profile picture URL
    phone?: string;
    department?: string;
    address?: string;                // HR: Employee address
    employeeId?: string;             // HR: External employee ID for linking with attendance
    documents?: IEmployeeDocument[]; // HR: Employee documents (contracts, IDs, etc.)
    createdAt: Date;
    updatedAt: Date;
}

// ── Mongoose document interface ─────────────────────────────────────
export interface IUserDocument extends IUser, Document {
    _id: Types.ObjectId;
    fullName: string; // virtual
    comparePassword(candidatePassword: string): Promise<boolean>;
}
