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
        department: {
            type: String,
            trim: true,
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
