import CustomerOrder from '../models/customer-order.model';
import { CreateCustomerOrderInput, UpdateCustomerOrderInput } from '../validation/customer-order.validation';
import { ICustomerOrderDocument } from '../types/customer-order.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateCustomerOrderInput): Promise<ICustomerOrderDocument> =>
    CustomerOrder.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, status, salesOrder } = query;
    const filter: Record<string, unknown> = {};
    if (customer)   filter.customer   = customer;
    if (status)     filter.status     = status;
    if (salesOrder) filter.salesOrder = salesOrder;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        CustomerOrder.find(filter)
            .populate('customer',   'name phone region sector')
            .populate('salesOrder', 'quotationNumber finalStatus issueDescription')
            .populate('workOrders', 'typeOfOrder issue punctuality')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        CustomerOrder.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<ICustomerOrderDocument> => {
    const doc = await CustomerOrder.findById(id)
        .populate('customer',   'name phone region sector address')
        .populate('salesOrder')
        .populate('workOrders');
    if (!doc) throw new AppError('Customer order not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateCustomerOrderInput): Promise<ICustomerOrderDocument> => {
    const doc = await CustomerOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Customer order not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await CustomerOrder.findByIdAndDelete(id);
    if (!doc) throw new AppError('Customer order not found', 404);
};
