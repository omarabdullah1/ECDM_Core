import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../utils/apiError';
import User from './auth.model';
import { IUserDocument, UserRole } from './auth.types';
import { RegisterInput, LoginInput } from './auth.validation';

// ── Helper: generate JWT ────────────────────────────────────────────
const signToken = (user: IUserDocument): string => {
    return jwt.sign(
        { userId: user._id.toString(), role: user.role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as unknown as number },
    );
};

// ── Register ────────────────────────────────────────────────────────
export const registerUser = async (data: RegisterInput): Promise<{ user: IUserDocument; token: string }> => {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
        throw new AppError('Email already registered', 409);
    }

    const user = await User.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: data.role || UserRole.Sales,
        phone: data.phone,
        department: data.department,
    });

    const token = signToken(user);

    // Remove password from response
    user.password = undefined as unknown as string;

    return { user, token };
};

// ── Login ───────────────────────────────────────────────────────────
export const loginUser = async (data: LoginInput): Promise<{ user: IUserDocument; token: string }> => {
    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user || !user.isActive) {
        throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
        throw new AppError('Invalid email or password', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user);
    user.password = undefined as unknown as string;

    return { user, token };
};

// ── Get current user ────────────────────────────────────────────────
export const getMe = async (userId: string): Promise<IUserDocument> => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }
    return user;
};

// ── Get all users (admin) ───────────────────────────────────────────
export const getAllUsers = async (
    query: Record<string, unknown>,
    skip: number,
    limit: number,
): Promise<{ users: IUserDocument[]; total: number }> => {
    const filter: Record<string, unknown> = {};

    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.search) {
        filter.$or = [
            { firstName: { $regex: query.search, $options: 'i' } },
            { lastName: { $regex: query.search, $options: 'i' } },
            { email: { $regex: query.search, $options: 'i' } },
        ];
    }

    const [users, total] = await Promise.all([
        User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        User.countDocuments(filter),
    ]);

    return { users, total };
};

// ── Create user (SuperAdmin) ────────────────────────────────────────
export const createUser = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    department?: string;
    isActive?: boolean;
}): Promise<IUserDocument> => {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
        throw new AppError('Email is already in use', 409);
    }

    const user = await User.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: data.role,
        phone: data.phone,
        department: data.department,
        isActive: data.isActive ?? true,
    });

    // Remove password from response
    user.password = undefined as unknown as string;

    return user;
};

// ── Get user by ID ──────────────────────────────────────────────────
export const getUserById = async (userId: string): Promise<IUserDocument> => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }
    return user;
};

// ── Update user (SuperAdmin) ────────────────────────────────────────
export const updateUser = async (
    userId: string,
    data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        password?: string;
        role?: UserRole;
        phone?: string;
        department?: string;
        isActive?: boolean;
    },
): Promise<IUserDocument> => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== user.email) {
        const existing = await User.findOne({ email: data.email });
        if (existing) {
            throw new AppError('Email is already in use', 409);
        }
    }

    // Update fields
    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.email !== undefined) user.email = data.email;
    if (data.password !== undefined) user.password = data.password;
    if (data.role !== undefined) user.role = data.role;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.department !== undefined) user.department = data.department;
    if (data.isActive !== undefined) user.isActive = data.isActive;

    await user.save();

    // Remove password from response
    user.password = undefined as unknown as string;

    return user;
};

// ── Delete user (SuperAdmin) ────────────────────────────────────────
export const deleteUser = async (userId: string): Promise<void> => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }
    await User.deleteOne({ _id: userId });
};
