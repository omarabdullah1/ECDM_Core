import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../utils/apiError';
import User from './auth.model';
import { IUserDocument, UserRole } from './auth.types';
import { RegisterInput, LoginInput } from './auth.validation';

export interface TokenPayload {
    userId: string;
    role: UserRole;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export const generateTokens = (user: IUserDocument): AuthTokens => {
    const accessToken = jwt.sign(
        { userId: user._id.toString(), role: user.role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as unknown as number },
    );

    const refreshToken = jwt.sign(
        { userId: user._id.toString() },
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as number },
    );

    return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
};

// ── Register ────────────────────────────────────────────────────────
export const registerUser = async (data: RegisterInput): Promise<{ user: IUserDocument; tokens: AuthTokens }> => {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
        throw new AppError('Email already registered', 409);
    }

    const createData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: UserRole.Sales,
        phone: data.phone,
    };

    const user = await User.create(createData);

    const tokens = generateTokens(user);

    await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

    const userResponse = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        phone: user.phone,
        avatar: user.avatar,
        avatarUrl: user.avatarUrl,
        address: user.address,
        employeeId: user.employeeId,
        documents: user.documents,
        targetBudget: user.targetBudget,
        targetSales: user.targetSales,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    } as IUserDocument;

    return { user: userResponse, tokens };
};

// ── Login ───────────────────────────────────────────────────────────
export const loginUser = async (data: LoginInput): Promise<{ user: IUserDocument; tokens: AuthTokens }> => {
    const user = await User.findOne({ email: data.email }).select('+password +refreshToken');
    if (!user || !user.isActive) {
        throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
        throw new AppError('Invalid email or password', 401);
    }

    user.lastLogin = new Date();

    const tokens = generateTokens(user);
    (user as unknown as Record<string, unknown>).refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    const userResponse = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        phone: user.phone,
        avatar: user.avatar,
        avatarUrl: user.avatarUrl,
        address: user.address,
        employeeId: user.employeeId,
        documents: user.documents,
        targetBudget: user.targetBudget,
        targetSales: user.targetSales,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    } as IUserDocument;

    return { user: userResponse, tokens };
};

// ── Refresh Token ───────────────────────────────────────────────────
export const refreshAccessToken = async (refreshToken: string): Promise<AuthTokens> => {
    const user = await User.findOne({ refreshToken }).select('+refreshToken');
    if (!user) {
        throw new AppError('Invalid refresh token', 401);
    }

    verifyRefreshToken(refreshToken);

    const tokens = generateTokens(user);
    (user as unknown as Record<string, unknown>).refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    return tokens;
};

// ── Logout ─────────────────────────────────────────────────────────
export const logoutUser = async (userId: string): Promise<void> => {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
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
    isActive?: boolean;
    targetBudget?: number;
    targetSales?: number;
    maxDiscountPercentage?: number;
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
        isActive: data.isActive ?? true,
        targetBudget: data.targetBudget ?? 0,
        targetSales: data.targetSales ?? 0,
        maxDiscountPercentage: data.maxDiscountPercentage ?? 0,
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
        isActive?: boolean;
        targetBudget?: number;
        targetSales?: number;
        maxDiscountPercentage?: number;
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
    if (data.isActive !== undefined) user.isActive = data.isActive;
    if (data.targetBudget !== undefined) user.targetBudget = data.targetBudget;
    if (data.targetSales !== undefined) user.targetSales = data.targetSales;
    if (data.maxDiscountPercentage !== undefined) user.maxDiscountPercentage = data.maxDiscountPercentage;

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
