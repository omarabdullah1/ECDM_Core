import SalesOrder from '../models/sales-order.model';
import { CreateSalesOrderInput, UpdateSalesOrderInput } from '../validation/sales-order.validation';
import { ISalesOrderDocument } from '../types/sales-order.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateSalesOrderInput): Promise<ISalesOrderDocument> =>
    SalesOrder.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, quotationStatus, finalStatus } = query;
    const filter: Record<string, unknown> = {};
    if (customer)        filter.customer        = customer;
    if (quotationStatus) filter.quotationStatus = quotationStatus;
    if (finalStatus)     filter.finalStatus     = finalStatus;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        SalesOrder.find(filter)
            .populate('customer',  'name phone region sector')
            .populate('salesLead', 'platform typeOfOrder')
            .populate('salesData', 'callOutcome callDate')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        SalesOrder.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<ISalesOrderDocument> => {
    const doc = await SalesOrder.findById(id)
        .populate('customer',  'name phone region sector')
        .populate('salesLead')
        .populate('salesData');
    if (!doc) throw new AppError('Sales order not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateSalesOrderInput): Promise<ISalesOrderDocument> => {
    const doc = await SalesOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Sales order not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await SalesOrder.findByIdAndDelete(id);
    if (!doc) throw new AppError('Sales order not found', 404);
};
