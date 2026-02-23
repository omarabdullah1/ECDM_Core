import SalesData from '../models/sales-data.model';
import { CreateSalesDataInput, UpdateSalesDataInput } from '../validation/sales-data.validation';
import { ISalesDataDocument } from '../types/sales-data.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateSalesDataInput): Promise<ISalesDataDocument> =>
    SalesData.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, salesPerson, callOutcome, marketingData } = query;
    const filter: Record<string, unknown> = {};
    if (salesPerson)   filter.salesPerson   = salesPerson;
    if (callOutcome)   filter.callOutcome   = callOutcome;
    if (marketingData) filter.marketingData = marketingData;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        SalesData.find(filter)
            .populate('marketingData', 'name phone dataSource uploadBatch')
            .populate('salesPerson',   'firstName lastName')
            .populate('customer',      'name phone')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        SalesData.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<ISalesDataDocument> => {
    const doc = await SalesData.findById(id)
        .populate('marketingData', 'name phone company sector dataSource uploadBatch')
        .populate('salesPerson',   'firstName lastName email')
        .populate('customer',      'name phone sector');
    if (!doc) throw new AppError('Sales data record not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateSalesDataInput): Promise<ISalesDataDocument> => {
    const doc = await SalesData.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Sales data record not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await SalesData.findByIdAndDelete(id);
    if (!doc) throw new AppError('Sales data record not found', 404);
};
