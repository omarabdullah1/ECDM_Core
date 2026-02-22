import { Document, Types } from 'mongoose';

// ── User roles (RBAC) ──────────────────────────────────────────────
export enum UserRole {
    SuperAdmin = 'SuperAdmin',
    Manager = 'Manager',
    Sales = 'Sales',
    HR = 'HR',
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
    phone?: string;
    department?: string;
    createdAt: Date;
    updatedAt: Date;
}

// ── Mongoose document interface ─────────────────────────────────────
export interface IUserDocument extends IUser, Document {
    _id: Types.ObjectId;
    fullName: string; // virtual
    comparePassword(candidatePassword: string): Promise<boolean>;
}
