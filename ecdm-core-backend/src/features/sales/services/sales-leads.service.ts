import SalesLead from '../models/sales-lead.model';
import { CreateSalesLeadInput, UpdateSalesLeadInput } from '../validation/sales-leads.validation';
import { ISalesLeadDocument } from '../types/sales-leads.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateSalesLeadInput): Promise<ISalesLeadDocument> =>
    SalesLead.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, salesPerson, platform, typeOfOrder } = query;
    const filter: Record<string, unknown> = {};
    if (customer)    filter.customer    = customer;
    if (salesPerson) filter.salesPerson = salesPerson;
    if (platform)    filter.platform    = platform;
    if (typeOfOrder) filter.typeOfOrder = typeOfOrder;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        SalesLead.find(filter)
            .populate('customer',      'name phone region sector')
            .populate('salesPerson',   'firstName lastName')
            .populate('marketingLead', 'title source status')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        SalesLead.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<ISalesLeadDocument> => {
    const doc = await SalesLead.findById(id)
        .populate('customer',      'name phone region sector')
        .populate('salesPerson',   'firstName lastName email')
        .populate('marketingLead', 'title source status contactName');
    if (!doc) throw new AppError('Sales lead not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateSalesLeadInput): Promise<ISalesLeadDocument> => {
    const doc = await SalesLead.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Sales lead not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await SalesLead.findByIdAndDelete(id);
    if (!doc) throw new AppError('Sales lead not found', 404);
};
