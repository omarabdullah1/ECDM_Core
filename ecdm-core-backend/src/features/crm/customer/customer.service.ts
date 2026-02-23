import Customer from './customer.model';
import { CreateCustomerInput, UpdateCustomerInput } from './customer.validation';
import { ICustomerDocument } from './customer.types';
import { AppError } from '../../../utils/apiError';

export const createCustomer = async (data: CreateCustomerInput): Promise<ICustomerDocument> =>
    Customer.create(data);

export const getCustomers = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, sector, status, customerAgeStatus } = query;
    const filter: Record<string, unknown> = {};
    if (search) filter.$text = { $search: search as string };
    if (sector)            filter.sector            = sector;
    if (status)            filter.status            = status;
    if (customerAgeStatus) filter.customerAgeStatus = customerAgeStatus;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Customer.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getCustomerById = async (id: string): Promise<ICustomerDocument> => {
    const doc = await Customer.findById(id);
    if (!doc) throw new AppError('Customer not found', 404);
    return doc;
};

export const updateCustomer = async (id: string, data: UpdateCustomerInput): Promise<ICustomerDocument> => {
    const doc = await Customer.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Customer not found', 404);
    return doc;
};

export const deleteCustomer = async (id: string): Promise<void> => {
    const doc = await Customer.findByIdAndDelete(id);
    if (!doc) throw new AppError('Customer not found', 404);
};
