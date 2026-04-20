import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument, UserRole } from './auth.types';

// ── Schema ──────────────────────────────────────────────────────────
const userSchema = new Schema<IUserDocument>(
    {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            maxlength: [50, 'First name cannot exceed 50 characters'],
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            maxlength: [50, 'Last name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // never return password by default
        },
        role: {
            type: String,
            enum: Object.values(UserRole),
            default: UserRole.Sales,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
        },
        avatar: {
            type: String,
        },
        phone: {
            type: String,
            trim: true,
        },

        // HR Fields
        avatarUrl: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
            maxlength: [500, 'Address cannot exceed 500 characters'],
        },
        department: {
            type: String,
            trim: true,
            maxlength: [100, 'Department cannot exceed 100 characters'],
        },
        salary: {
            type: Number,
            default: 0,
            min: [0, 'Salary cannot be negative'],
        },
        employeeId: {
            type: String,
            unique: true,
            sparse: true, // Allow null/undefined for unique index
            trim: true,
        },
        documents: [{
            title: { type: String, required: true },
            fileUrl: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now },
        }],
        targetBudget: {
            type: Number,
            default: 0,
        },
        targetSales: {
            type: Number,
            default: 0,
        },
        maxDiscountPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        commissionPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        refreshToken: {
            type: String,
            select: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// ── Indexes ─────────────────────────────────────────────────────────
// email index is already created by `unique: true` on the field
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// ── Virtuals ────────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function (this: IUserDocument) {
    return `${this.firstName} ${this.lastName}`;
});

// ── Pre-save: auto-generate employeeId ─────────────────────────────
userSchema.pre<IUserDocument>('save', async function (next) {
    // Only generate if it's a new document and employeeId doesn't exist
    if (this.isNew && !this.employeeId) {
        try {
            // Find the user with the highest employeeId
            const lastUser = await (this.constructor as Model<IUserDocument>)
                .findOne({ employeeId: { $exists: true, $ne: null } })
                .sort({ employeeId: -1 })
                .exec();

            let nextNumber = 1001; // Starting number

            if (lastUser && lastUser.employeeId) {
                // Extract the number from the string (e.g., from 'EMP-1042' extract 1042)
                const lastNumber = parseInt(lastUser.employeeId.replace('EMP-', ''), 10);
                if (!isNaN(lastNumber)) {
                    nextNumber = lastNumber + 1;
                }
            }

            this.employeeId = `EMP-${nextNumber}`;
        } catch (error) {
            return next(error as Error);
        }
    }
    next();
});

// ── Pre-save: hash password ─────────────────────────────────────────
userSchema.pre<IUserDocument>('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ── Instance methods ────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (
    candidatePassword: string,
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// ── Model ───────────────────────────────────────────────────────────
const User: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);

export default User;
