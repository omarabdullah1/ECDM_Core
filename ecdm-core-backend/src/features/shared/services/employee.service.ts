import Employee from '../models/employee.model';
import User from '../../auth/auth.model';
import { CreateEmployeeInput, UpdateEmployeeInput } from '../validation/employee.validation';
import { IEmployeeDocument } from '../types/employee.types';
import { AppError } from '../../../utils/apiError';

export const createEmployee = async (data: CreateEmployeeInput): Promise<IEmployeeDocument> =>
    Employee.create(data);

export const getEmployees = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, department, status } = query;
    const filter: Record<string, unknown> = {};
    if (search)     filter.$text      = { $search: search as string };
    if (department) filter.department = department;
    if (status)     filter.status     = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Employee.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getEmployeeById = async (id: string): Promise<any> => {
    const emp = await Employee.findOne({
        $or: [
            { _id: id },
            { userId: id }
        ]
    }).populate('userId');
    
    if (emp) return emp;

    // Smart Lookup Fallback: Fetch basic user data
    const user = await User.findById(id);
    if (!user) throw new AppError('Employee and User not found', 404);

    return {
        _id: user._id,
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.firstName + ' ' + user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        phone: user.phone,
        address: user.address,
        employeeId: user.employeeId,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
    };
};

export const updateEmployee = async (id: string, data: UpdateEmployeeInput): Promise<IEmployeeDocument> => {
    const emp = await Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!emp) throw new AppError('Employee not found', 404);
    return emp;
};

export const deleteEmployee = async (id: string): Promise<void> => {
    const emp = await Employee.findByIdAndDelete(id);
    if (!emp) throw new AppError('Employee not found', 404);
};

/**
 * Bulk delete multiple employees by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await Employee.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

