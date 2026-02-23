import SalesOrder from './sales-order.model';
import { AppError } from '../../../utils/apiError';
import { CreateSalesOrderInput, UpdateSalesOrderInput } from './sales-order.validation';

export const create = async (data: CreateSalesOrderInput) => SalesOrder.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, finalStatus, quotationStatus, customer } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (finalStatus)      filter.finalStatus      = finalStatus;
    if (quotationStatus)  filter.quotationStatus  = quotationStatus;
    if (customer)         filter.customer         = customer;

    const [data, total] = await Promise.all([
        SalesOrder.find(filter)
            .populate('customer', 'name phone region sector')
            .populate('salesLead')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        SalesOrder.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };
};

export const getById = async (id: string) => {
    const item = await SalesOrder.findById(id)
        .populate('customer', 'name phone region sector')
        .populate('salesLead');
    if (!item) throw new AppError('Sales order not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateSalesOrderInput) => {
    const item = await SalesOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Sales order not found', 404);
    return item;
};

export const deleteSalesOrder = async (id: string) => {
    const item = await SalesOrder.findByIdAndDelete(id);
    if (!item) throw new AppError('Sales order not found', 404);
};
