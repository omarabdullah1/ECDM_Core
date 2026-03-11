import Customer from '../models/contact.model';
import MarketingLead from '../../marketing/models/marketing-lead.model';
import SalesLead from '../../sales/models/sales-lead.model';
import SalesOrder from '../../sales/models/sales-order.model';
import CustomerOrder from '../../customer/models/customer-order.model';
import WorkOrder from '../../operations/models/work-order.model';
import FollowUp from '../../customer/models/follow-up.model';
import Feedback from '../../customer/models/feedback.model';
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
    const { page = 1, limit = 10, search, sector, type, potentialStatus } = query;
    const filter: Record<string, unknown> = {};
    if (search) filter.$text = { $search: search as string };
    if (sector) filter.sector = sector;
    if (type)   filter.type   = type;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get customers first
    let customers = await Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();
    const total = await Customer.countDocuments(filter);
    
    // Enrich each customer with potential status by checking SalesOrder
    const enrichedData = await Promise.all(
        customers.map(async (customer) => {
            // Check if customer has any sales order marked as "Not Potential"
            const hasNonPotentialOrder = await SalesOrder.exists({ 
                customer: customer._id, 
                finalStatusThirdFollowUp: 'Not Potential' 
            });
            
            return {
                ...customer,
                isNonPotential: !!hasNonPotentialOrder
            };
        })
    );
    
    // Apply potential status filter if provided
    let data = enrichedData;
    let filteredTotal = total;
    if (potentialStatus === 'Potential') {
        data = enrichedData.filter(c => !c.isNonPotential);
        filteredTotal = data.length;
    } else if (potentialStatus === 'Non-Potential') {
        data = enrichedData.filter(c => c.isNonPotential);
        filteredTotal = data.length;
    }
    
    return { data, pagination: { page: Number(page), limit: Number(limit), total: filteredTotal, pages: Math.ceil(filteredTotal / Number(limit)) } };
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
 * Customer 360° Report
 * Aggregates all data across modules: SalesOrders, CustomerOrders, WorkOrders, FollowUps, Feedbacks
 * Calculates KPIs: totalSpent, totalVisits, totalOrders
 */
export interface Customer360Report {
    customer: ICustomerDocument;
    kpis: {
        totalSpent: number;
        totalVisits: number;
        totalOrders: number;
        totalWorkOrders: number;
        totalFollowUps: number;
        totalFeedbacks: number;
    };
    history: {
        salesOrders: unknown[];
        customerOrders: unknown[];
        workOrders: unknown[];
        followUps: unknown[];
        feedbacks: unknown[];
    };
}

export const getCustomerReport = async (id: string): Promise<Customer360Report> => {
    // Fetch customer
    const customer = await Customer.findById(id);
    if (!customer) throw new AppError('Customer not found', 404);

    // Fetch all related documents in parallel
    const [salesOrders, customerOrders, followUps, feedbacks] = await Promise.all([
        SalesOrder.find({ customer: id }).sort({ createdAt: -1 }).lean(),
        CustomerOrder.find({ customerId: id }).sort({ createdAt: -1 }).lean(),
        FollowUp.find({ customer: id }).sort({ createdAt: -1 }).lean(),
        Feedback.find({ customerId: id }).sort({ createdAt: -1 }).lean(),
    ]);

    // Fetch work orders linked to customer orders
    const customerOrderIds = customerOrders.map((o) => o._id);
    const workOrders = await WorkOrder.find({ customerOrderId: { $in: customerOrderIds } })
        .sort({ createdAt: -1 })
        .lean();

    // Calculate KPIs
    const totalSpent = customerOrders.reduce((sum, order) => sum + ((order as { cost?: number }).cost || 0), 0);
    const totalVisits = customerOrders.filter((o) => (o as { actualVisitDate?: Date }).actualVisitDate).length;

    return {
        customer,
        kpis: {
            totalSpent,
            totalVisits,
            totalOrders: salesOrders.length,
            totalWorkOrders: workOrders.length,
            totalFollowUps: followUps.length,
            totalFeedbacks: feedbacks.length,
        },
        history: {
            salesOrders,
            customerOrders,
            workOrders,
            followUps,
            feedbacks,
        },
    };
};

/**
 * Smart Auto-Increment: Get next available Customer ID
 * 
 * This function uses a mathematical approach to find the highest existing
 * customerId in the database, ensuring no conflicts even when IDs are
 * manually overridden by admins.
 * 
 * @returns The next available customerId (e.g., "CUS-61")
 */
export const getNextCustomerId = async (): Promise<string> => {
    // Fetch all customer IDs to find the absolute mathematical maximum
    const customers = await Customer.find({}, { customerId: 1 }).lean();
    
    let maxNumber = 0;
    
    for (const customer of customers) {
        if (customer.customerId && customer.customerId.startsWith('CUS-')) {
            // Extract the number part
            const numPart = parseInt(customer.customerId.replace('CUS-', ''), 10);
            if (!isNaN(numPart) && numPart > maxNumber) {
                maxNumber = numPart;
            }
        }
    }
    
    // Return the next ID
    return `CUS-${maxNumber + 1}`;
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
