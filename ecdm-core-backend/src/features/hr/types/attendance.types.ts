import { Document, Types } from 'mongoose';

// ── Attendance Status ──────────────────────────────────────────────
export enum AttendanceStatus {
    Present = 'Present',
    Absent = 'Absent',
    Late = 'Late',
    HalfDay = 'Half-day',
    Leave = 'Leave',
    Empty = '',
}

// ── Base interface (plain data shape) ───────────────────────────────
export interface IAttendance {
    employeeId: string;          // Business ID from Excel (e.g., EMP-1001)
    userId?: Types.ObjectId;     // Linked internal user if exists
    name: string;
    department: string;
    date: Date;
    day: string;
    checkIn: string;
    checkOut: string;
    status: AttendanceStatus;
    notes: string;
    uploadedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ── Mongoose document interface ─────────────────────────────────────
export interface IAttendanceDocument extends IAttendance, Document {
    _id: Types.ObjectId;
}

// ── HR Document type for user profile ───────────────────────────────
export interface IEmployeeDocument {
    title: string;
    fileUrl: string;
    uploadedAt: Date;
}
