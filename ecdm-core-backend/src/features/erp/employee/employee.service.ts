import Employee from './employee.model';
import { CreateEmployeeInput, UpdateEmployeeInput } from './employee.validation';
import { IEmployeeDocument } from './employee.types';
import { AppError } from '../../../utils/apiError';

export const createEmployee = async (data: CreateEmployeeInput): Promise<IEmployeeDocument> => {
    return Employee.create(data);
};

export const getEmployees = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, department, status } = query;
    const filter: Record<string, unknown> = {};
    if (search) filter.$text = { $search: search as string };
    if (department) filter.department = department;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Employee.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getEmployeeById = async (id: string): Promise<IEmployeeDocument> => {
    const emp = await Employee.findById(id);
    if (!emp) throw new AppError('Employee not found', 404);
    return emp;
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
