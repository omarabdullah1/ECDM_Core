import MarketingLead from '../models/marketing-lead.model';
import SalesLead from '../../sales/models/sales-lead.model';
import Customer from '../../shared/models/contact.model';
import { CreateMarketingLeadInput, UpdateMarketingLeadInput } from '../validation/marketing-leads.validation';
import { IMarketingLeadDocument } from '../types/marketing-leads.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateMarketingLeadInput & Record<string, unknown>): Promise<IMarketingLeadDocument> => {
    // Handle SSOT: If customerId not provided, create/upsert Customer first
    let customerId = data.customerId as string | undefined;
    
    if (!customerId && data.name && data.phone) {
        const normalizedPhone = (data.phone as string).replace(/\s+/g, '');
        const customer = await Customer.findOneAndUpdate(
            { phone: normalizedPhone },
            {
                $set: {
                    name: data.name,
                    phone: normalizedPhone,
                    type: data.type || 'Other',
                    sector: data.sector || 'Other',
                },
                $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true, new: true }
        );
        customerId = customer._id.toString();
    }

    if (!customerId) {
        throw new AppError('Either customerId or name+phone is required', 400);
    }
    
    const marketingLead = await MarketingLead.create({
        customerId,
        date: data.date || new Date(),
        notes: data.notes || '',
        campaign: data.campaign,
        assignedTo: data.assignedTo,
    });

    // Auto-forward to Sales: Create a corresponding SalesLead record
    try {
        await SalesLead.create({
            customerId,
            date:            marketingLead.date || new Date(),
            marketingLeadId: marketingLead._id,
            issue:       '',
            order:       '',
            reason:      '',
            salesPerson: '',
            notes:       '',
        });
    } catch (error) {
        // Log error but don't fail the marketing lead creation
        console.error('Auto-forward to SalesLead failed:', error);
    }

    return marketingLead;
};

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, source, status, type, sector, campaign, assignedTo } = query;
    const filter: Record<string, unknown> = {};
    if (search)     filter.$text     = { $search: search as string };
    if (source)     filter.source    = source;
    if (status)     filter.status    = status;
    if (type)       filter.type      = type;
    if (sector)     filter.sector    = sector;
    if (campaign)   filter.campaign  = campaign;
    if (assignedTo) filter.assignedTo = assignedTo;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        MarketingLead.find(filter)
            .populate('customerId', 'customerId name phone type sector email company')
            .populate('campaign',   'name platform status')
            .populate('assignedTo', 'firstName lastName')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        MarketingLead.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<IMarketingLeadDocument> => {
    const doc = await MarketingLead.findById(id)
        .populate('customerId', 'customerId name phone type sector email company address region notes')
        .populate('campaign',   'name platform status')
        .populate('assignedTo', 'firstName lastName email');
    if (!doc) throw new AppError('Marketing lead not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateMarketingLeadInput): Promise<IMarketingLeadDocument> => {
    const doc = await MarketingLead.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Marketing lead not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await MarketingLead.findByIdAndDelete(id);
    if (!doc) throw new AppError('Marketing lead not found', 404);
};

/**
 * Bulk delete multiple marketing leads by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await MarketingLead.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

