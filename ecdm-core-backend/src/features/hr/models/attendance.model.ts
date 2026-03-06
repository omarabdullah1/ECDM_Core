import mongoose, { Schema, Model } from 'mongoose';
import { IAttendanceDocument, AttendanceStatus } from '../types/attendance.types';

// ── Schema ──────────────────────────────────────────────────────────
const attendanceSchema = new Schema<IAttendanceDocument>(
    {
        employeeId: {
            type: String,
            required: [true, 'Employee ID is required'],
            trim: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        department: {
            type: String,
            default: '',
            trim: true,
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
        },
        day: {
            type: String,
            default: '',
            trim: true,
        },
        checkIn: {
            type: String,
            default: '',
            trim: true,
        },
        checkOut: {
            type: String,
            default: '',
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(AttendanceStatus),
            default: AttendanceStatus.Empty,
        },
        notes: {
            type: String,
            default: '',
            maxlength: [500, 'Notes cannot exceed 500 characters'],
        },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// ── Indexes ─────────────────────────────────────────────────────────
attendanceSchema.index({ employeeId: 1 });
attendanceSchema.index({ userId: 1 });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ department: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true }); // Prevent duplicate entries

// ── Model ───────────────────────────────────────────────────────────
const Attendance: Model<IAttendanceDocument> = mongoose.model<IAttendanceDocument>('Attendance', attendanceSchema);

export default Attendance;
