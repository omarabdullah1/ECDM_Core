import SalesLead from './sales-lead.model';
import { CreateSalesLeadInput, UpdateSalesLeadInput } from './sales-lead.validation';
import { ISalesLeadDocument } from './sales-lead.types';
import { AppError } from '../../../utils/apiError';

export const createSalesLead = async (data: CreateSalesLeadInput): Promise<ISalesLeadDocument> =>
    SalesLead.create(data);

export const getSalesLeads = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, salesPerson, platform } = query;
    const filter: Record<string, unknown> = {};
    if (customer)    filter.customer    = customer;
    if (salesPerson) filter.salesPerson = salesPerson;
    if (platform)    filter.platform    = platform;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        SalesLead.find(filter)
            .populate('customer', 'name phone sector status')
            .populate('salesPerson', 'firstName lastName email')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        SalesLead.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getSalesLeadById = async (id: string): Promise<ISalesLeadDocument> => {
    const doc = await SalesLead.findById(id)
        .populate('customer', 'name phone sector status')
        .populate('salesPerson', 'firstName lastName email');
    if (!doc) throw new AppError('Sales lead not found', 404);
    return doc;
};

export const updateSalesLead = async (id: string, data: UpdateSalesLeadInput): Promise<ISalesLeadDocument> => {
    const doc = await SalesLead.findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .populate('customer', 'name phone sector status')
        .populate('salesPerson', 'firstName lastName email');
    if (!doc) throw new AppError('Sales lead not found', 404);
    return doc;
};

export const deleteSalesLead = async (id: string): Promise<void> => {
    const doc = await SalesLead.findByIdAndDelete(id);
    if (!doc) throw new AppError('Sales lead not found', 404);
};
