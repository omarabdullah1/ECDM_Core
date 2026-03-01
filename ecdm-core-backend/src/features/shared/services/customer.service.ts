import Customer from '../models/contact.model';
import MarketingLead from '../../marketing/models/marketing-lead.model';
import SalesLead from '../../sales/models/sales-lead.model';
import { ICustomerDocument } from '../types/contact.types';
import { AppError } from '../../../utils/apiError';

interface CustomerHistory {
    marketing: Array<{
        _id: string;
        date: Date;
        status: string;
        source?: string;
        notes?: string;
    }>;
    sales: Array<{
        _id: string;
        date: Date;
        status: string;
        salesPerson: string;
        issue?: string;
        order?: string;
    }>;
}

export const createCustomer = async (data: Record<string, unknown>): Promise<ICustomerDocument> =>
    Customer.create(data);

export const getCustomers = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, sector, type } = query;
    const filter: Record<string, unknown> = {};
    if (search) filter.$text = { $search: search as string };
    if (sector) filter.sector = sector;
    if (type)   filter.type   = type;
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

/**
 * Get customer history/timeline across all modules
 */
export const getCustomerHistory = async (id: string): Promise<CustomerHistory> => {
    const customer = await Customer.findById(id);
    if (!customer) throw new AppError('Customer not found', 404);

    const [marketingLeads, salesLeads] = await Promise.all([
        MarketingLead.find({ customerId: id }).sort({ date: -1 }).lean(),
        SalesLead.find({ customerId: id }).sort({ date: -1 }).lean(),
    ]);

    return {
        marketing: marketingLeads.map(ml => ({
            _id: ml._id.toString(),
            date: ml.date,
            status: ml.status || 'New',
            source: ml.source,
            notes: ml.notes,
        })),
        sales: salesLeads.map(sl => ({
            _id: sl._id.toString(),
            date: sl.date,
            status: sl.status,
            salesPerson: sl.salesPerson,
            issue: sl.issue,
            order: sl.order,
        })),
    };
};

export const updateCustomer = async (id: string, data: Record<string, unknown>): Promise<ICustomerDocument> => {
    const doc = await Customer.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Customer not found', 404);
    return doc;
};

export const deleteCustomer = async (id: string): Promise<void> => {
    const doc = await Customer.findByIdAndDelete(id);
    if (!doc) throw new AppError('Customer not found', 404);
};

/**
 * Bulk delete multiple customers by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await Customer.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

/**
 * TEMPORARY DATABASE PATCH FUNCTION
 * Retroactively fixes customers created via findOneAndUpdate (which bypassed pre-save hooks)
 * Finds all customers with missing/null customerId and generates proper IDs
 */
export const patchMissingCustomerIds = async (): Promise<{ fixed: number; errors: string[] }> => {
    const result = {
        fixed: 0,
        errors: [] as string[],
    };

    try {
        // Find all customers where customerId is null, undefined, or missing
        const customersWithoutId = await Customer.find({
            $or: [
                { customerId: null },
                { customerId: { $exists: false } },
                { customerId: '' },
            ],
        });

        console.log(`Found ${customersWithoutId.length} customers without customerId`);

        // Process each customer individually
        for (const customer of customersWithoutId) {
            try {
                // Call .save() to trigger the pre('save') hook that generates customerId
                await customer.save();
                result.fixed++;
                console.log(`✓ Fixed customer ${customer._id} → ${customer.customerId}`);
            } catch (err) {
                const error = err as { message?: string };
                const errorMsg = `Failed to fix customer ${customer._id}: ${error.message}`;
                result.errors.push(errorMsg);
                console.error(`✗ ${errorMsg}`);
            }
        }

        console.log(`Patching complete: Fixed ${result.fixed} customers`);
    } catch (err) {
        const error = err as { message?: string };
        result.errors.push(`Database query error: ${error.message}`);
        console.error('Patch failed:', error.message);
    }

    return result;
};
