import Customer from '../models/contact.model';
import MarketingLead from '../../marketing/models/marketing-lead.model';
import SalesLead from '../../sales/models/sales-lead.model';
import SalesOrder from '../../sales/models/sales-order.model';
import CustomerOrder from '../../customer/models/customer-order.model';
import WorkOrder from '../../operations/models/work-order.model';
import FollowUp from '../../customer/models/follow-up.model';
import Feedback from '../../customer/models/feedback.model';
import SalesData from '../../sales/models/sales-data.model';
import SalesFollowUp from '../../sales/models/sales-followup.model';
import { ICustomer, ICustomerDocument } from '../types/contact.types';
import { AppError } from '../../../utils/apiError';
import User from '../../auth/auth.model';
import { JwtPayload } from '../../../middlewares/auth.middleware';
import { PaginatedResult } from '../../../utils/pagination';

export interface EnrichedCustomer extends ICustomer {
    _id: any;
    isNonPotential?: boolean;
    progress?: string;
    lastInteraction?: string;
    lastIssue?: string;
}

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

export const getCustomers = async (query: Record<string, unknown>, user?: JwtPayload): Promise<PaginatedResult<EnrichedCustomer>> => {
    const { page = 1, limit = 10, search, sector, type, potentialStatus, status } = query;
    const filter: Record<string, unknown> = {};
    
    // RBAC: Sales role restriction on global list
    if (user?.role === 'Sales') {
        const userDoc = await User.findById(user.userId).select('email firstName lastName').lean();
        if (userDoc) {
            const userEmail = userDoc.email;
            const userName = `${userDoc.firstName} ${userDoc.lastName}`.trim();

            const [leads, orders, data, followups] = await Promise.all([
                SalesLead.find({ $or: [{ salesPerson: userEmail }, { salesPerson: userName }] }).select('customerId').lean(),
                SalesOrder.find({ salesPerson: user.userId }).select('customer').lean(),
                SalesData.find({ salesPerson: user.userId }).select('customer').lean(),
                SalesFollowUp.find({ salesPerson: user.userId }).select('customer').lean()
            ]);

            const customerIds = new Set<string>();
            leads.forEach(l => { if (l.customerId) customerIds.add(l.customerId.toString()); });
            orders.forEach(o => { if (o.customer) customerIds.add(o.customer.toString()); });
            data.forEach(d => { if (d.customer) customerIds.add(d.customer.toString()); });
            followups.forEach(f => { if (f.customer) customerIds.add(f.customer.toString()); });

            filter._id = { $in: Array.from(customerIds) };
        }
    }

    if (search) {
        const searchRegex = { $regex: search, $options: 'i' };
        filter.$or = [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
            { companyName: searchRegex },
            { customerId: searchRegex },
        ];
    }
    if (sector) filter.sector = sector;
    if (type)   filter.type   = type;
    if (status) filter.status = status;
    
    // Support for "My Customers" view
    if (query.csPerson) {
        filter.csPerson = query.csPerson;
    } else if (query.my === 'true' && user) {
        // Automatically filter by current user's email if "my=true" is passed
        const userDoc = await User.findById(user.userId).select('email').lean();
        if (userDoc) {
            const userEmail = userDoc.email;
            
            // Find customers where the user is csPerson in orders, followups, or feedback
            const [orders, followups, feedbacks] = await Promise.all([
                CustomerOrder.find({ csPerson: userEmail }).select('customerId').lean(),
                FollowUp.find({ csPerson: userEmail }).select('customer').lean(),
                Feedback.find({ csPerson: userEmail }).select('customerId').lean()
            ]);
            
            const customerIds = new Set<string>();
            orders.forEach(o => { if (o.customerId) customerIds.add(o.customerId.toString()); });
            followups.forEach(f => { if (f.customer) customerIds.add(f.customer.toString()); });
            feedbacks.forEach(f => { if (f.customerId) customerIds.add(f.customerId.toString()); });
            
            const myFilterOr = [
                { csPerson: userEmail },
                { _id: { $in: Array.from(customerIds) } }
            ];

            if (filter.$or) {
                // If search already added an $or, we must combine them using $and to avoid overwriting
                const searchOr = filter.$or;
                delete filter.$or;
                filter.$and = [
                    { $or: searchOr },
                    { $or: myFilterOr }
                ];
            } else {
                filter.$or = myFilterOr;
            }
        }
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    let customers = await Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();
    const total = await Customer.countDocuments(filter);
    
    const enrichedData = await Promise.all(
        customers.map(async (customer) => {
            const hasNonPotentialOrder = await SalesOrder.exists({ 
                customer: customer._id, 
                finalStatusThirdFollowUp: 'Not Potential' 
            });
            
            let result: any = {
                ...customer,
                isNonPotential: !!hasNonPotentialOrder
            };

            // Enrichment for "My Customers" (CS Progress)
            if (query.my === 'true') {
                const latestOrder = await CustomerOrder.findOne({ customerId: customer._id }).sort({ createdAt: -1 }).lean();
                if (latestOrder) {
                    const [latestWO, latestFU, latestFB] = await Promise.all([
                        WorkOrder.findOne({ customerOrderId: latestOrder._id }).sort({ createdAt: -1 }).lean(),
                        FollowUp.findOne({ customerOrderId: latestOrder._id }).sort({ createdAt: -1 }).lean(),
                        Feedback.findOne({ customerOrderId: latestOrder._id }).sort({ createdAt: -1 }).lean()
                    ]);

                    let progress = 'Settled (Fully Completed)';
                    let lastInteraction = 'Feedback Received';

                    if (!latestWO || latestWO.taskCompleted !== 'Yes') {
                        progress = 'Operations (Maintenance/Task)';
                        lastInteraction = latestWO?.notes || latestOrder.issue || 'Order in Operations';
                    } else if (!latestFU || latestFU.status === 'Pending') {
                        progress = 'CS (Follow-up Pending)';
                        lastInteraction = latestFU?.notes || 'Task completed, awaiting follow-up';
                    } else if (!latestFB) {
                        progress = 'CS (Feedback Pending)';
                        lastInteraction = latestFU?.notes || 'Follow-up done, awaiting feedback';
                    } else {
                        lastInteraction = latestFB.notes || 'Fully completed and rated';
                    }

                    result.progress = progress;
                    result.lastInteraction = lastInteraction;
                } else {
                    result.progress = 'Active / No Orders';
                    result.lastInteraction = 'Modified Record';
                }
            }
            
            return result;
        })
    );
    
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
export const getCustomerHistory = async (id: string, user?: JwtPayload): Promise<CustomerHistory> => {
    // RBAC: Sales can only see their own customers
    if (user?.role === 'Sales') {
        const isAllowed = await checkSalesPersonAccess(id, user.userId);
        if (!isAllowed) throw new AppError('Forbidden: You only have access to your assigned customer profiles', 403);
    }

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
        salesOrders: Array<any & { pipelineStage: string }>;
        customerOrders: Array<any & { pipelineStage: string; remainingBalance: number }>;
        workOrders: any[];
        followUps: any[];
        feedbacks: any[];
    };
}

/**
 * Helper: Check if a salesperson has access to a specific customer
 */
const checkSalesPersonAccess = async (customerId: string, userId: string) => {
    const userDoc = await User.findById(userId).select('email firstName lastName').lean();
    if (!userDoc) return false;

    const userEmail = userDoc.email;
    const userName = `${userDoc.firstName} ${userDoc.lastName}`.trim();

    // Check leads, orders, data, and followups
    const [lead, order, data, followup] = await Promise.all([
        SalesLead.findOne({ customerId, $or: [{ salesPerson: userEmail }, { salesPerson: userName }] }).select('_id').lean(),
        SalesOrder.findOne({ customer: customerId, salesPerson: userId }).select('_id').lean(),
        SalesData.findOne({ customer: customerId, salesPerson: userId }).select('_id').lean(),
        SalesFollowUp.findOne({ customer: customerId, salesPerson: userId }).select('_id').lean()
    ]);

    return !!(lead || order || data || followup);
};

export const getCustomerReport = async (id: string, user?: JwtPayload): Promise<Customer360Report> => {
    // RBAC: Sales can only see their own customers
    if (user?.role === 'Sales') {
        const isAllowed = await checkSalesPersonAccess(id, user.userId);
        if (!isAllowed) throw new AppError('Forbidden: You only have access to your assigned customer profiles', 403);
    }

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

    // ─── Pipeline Stage Calculation Helper ──────────────────────────────────
    const getOrderPipelineStage = (order: any, type: 'Sales' | 'Customer') => {
        if (type === 'Sales') {
            // Check if it has moved to CustomerOrder
            const hasCustomerOrder = customerOrders.some(co => co.salesOrderId?.toString() === order._id.toString());
            if (hasCustomerOrder) return 'Operational (Moved to Ops)';

            if (order.finalStatus === 'Rejected' || order.orderStatus === 'Closed') return 'Closed / Rejected';
            if (order.quotationStatus === 'Pending' || !order.quotation?.grandTotal) return 'Sales (Quotation Pending)';
            if (order.finalStatus === 'Pending' || order.finalStatus === 'Negotiation') return 'Sales (Waiting for Approval)';
            if (order.siteInspectionDate) return 'Operational (Site Visit Scheduled)';
            
            return 'Sales (Initial)';
        } else {
            // CustomerOrder stages
            const wo = workOrders.find(w => w.customerOrderId?.toString() === order._id.toString());
            if (!wo || wo.taskCompleted !== 'Yes') return 'Operations (Maintenance/Task)';

            const fu = followUps.find(f => f.customerOrderId?.toString() === order._id.toString());
            if (!fu || fu.status === 'Pending') return 'Customer Service (Follow-up)';

            const fb = feedbacks.find(f => f.customerOrderId?.toString() === order._id.toString());
            if (!fb) return 'Customer Service (Feedback)';

            return 'Settled (Fully Completed)';
        }
    };

    const enrichedSalesOrders = salesOrders.map(so => ({
        ...so,
        pipelineStage: getOrderPipelineStage(so, 'Sales'),
    }));

    const enrichedCustomerOrders = customerOrders.map(co => ({
        ...co,
        pipelineStage: getOrderPipelineStage(co, 'Customer'),
        remainingBalance: (co.cost || 0) - (co.paidAmount || 0),
    }));

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
            salesOrders: enrichedSalesOrders,
            customerOrders: enrichedCustomerOrders,
            workOrders,
            followUps,
            feedbacks,
        },
    };
};

/**
 * Get customers associated with a specific sales person
 */
export const getSalesPersonCustomers = async (userId: string, userEmail: string, userName: string, query: any): Promise<PaginatedResult<EnrichedCustomer>> => {
    const { search, page = 1, limit = 10 } = query;

    // 1. Find all unique customer IDs from various sales modules
    const [leads, orders, data, followups] = await Promise.all([
        SalesLead.find({
            $or: [
                { salesPerson: userEmail },
                { salesPerson: userName }
            ]
        }).select('customerId').lean(),
        SalesOrder.find({ salesPerson: userId }).select('customer').lean(),
        SalesData.find({ salesPerson: userId }).select('customer').lean(),
        SalesFollowUp.find({ salesPerson: userId }).select('customer').lean()
    ]);

    const customerIds = new Set<string>();
    leads.forEach(l => { if (l.customerId) customerIds.add(l.customerId.toString()); });
    orders.forEach(o => { if (o.customer) customerIds.add(o.customer.toString()); });
    data.forEach(d => { if (d.customer) customerIds.add(d.customer.toString()); });
    followups.forEach(f => { if (f.customer) customerIds.add(f.customer.toString()); });

    if (customerIds.size === 0) {
        return { data: [], pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 } };
    }

    // 2. Query Customer model with filters
    const filter: any = { _id: { $in: Array.from(customerIds) } };
    if (search) {
        const searchRegex = { $regex: search, $options: 'i' };
        filter.$or = [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
            { company: searchRegex },
            { customerId: searchRegex },
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const customers = await Customer.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

    const total = await Customer.countDocuments(filter);

    // 3. Enriched with latest activity/status
    const enrichedData = await Promise.all(customers.map(async (c) => {
        // Get latest lead status
        const latestLead = await SalesLead.findOne({ customerId: c._id }).sort({ date: -1 }).select('status issue').lean();
        // Get latest order status
        const latestOrder = await SalesOrder.findOne({ customer: c._id })
            .sort({ createdAt: -1 })
            .select('orderStatus finalStatus quotation quotationStatus finalStatusThirdFollowUp quotationStatusFirstFollowUp statusSecondFollowUp issueDescription issue createdAt followUpFirst followUpSecond followUpThird reasonOfQuotation notes')
            .lean();
        
        let progress = 'New';
        let lastIssue = '';

        if (latestOrder) {
            // Pipeline Priority Logic
            if (latestOrder.finalStatusThirdFollowUp === 'Accepted' || latestOrder.finalStatus === 'Won') {
                progress = 'Quotation Accepted';
            } else if (latestOrder.finalStatusThirdFollowUp === 'Not Potential' || latestOrder.finalStatus === 'Lost') {
                progress = 'Lost / Not Potential';
            } else if (latestOrder.followUpThird) {
                progress = '3rd Follow-up Scheduled';
            } else if (latestOrder.statusSecondFollowUp === 'Scheduled') {
                progress = '2nd Follow-up Scheduled';
            } else if (latestOrder.quotationStatusFirstFollowUp === 'Accepted' || latestOrder.quotationStatus === 'Accepted') {
                progress = 'Quotation Accepted';
            } else if (latestOrder.quotationStatusFirstFollowUp === 'Rejected' || latestOrder.quotationStatus === 'Rejected') {
                progress = 'Quotation Rejected';
            } else if (latestOrder.quotationStatusFirstFollowUp === 'Negotiation' || latestOrder.quotationStatus === 'Negotiation') {
                progress = 'Negotiation';
            } else if (latestOrder.orderStatus === 'Canceled') {
                progress = 'Order Canceled';
            } else if (latestOrder.orderStatus === 'Completed') {
                progress = 'Order Completed';
            } else if (latestOrder.orderStatus === 'In Progress') {
                progress = 'In Progress';
            } else if (latestOrder.quotationStatus === 'Pending' && (!latestOrder.quotation?.grandTotal)) {
                progress = 'Quotation Pending';
            } else if (latestOrder.finalStatus === 'Pending') {
                progress = 'Waiting for Response';
            } else {
                progress = latestOrder.orderStatus || 'Order Placed';
            }

            // Priority for Last Interaction
            if (latestOrder.followUpThird) {
                lastIssue = `3rd Follow-up: ${latestOrder.finalStatusThirdFollowUp || 'Scheduled'}`;
            } else if (latestOrder.followUpSecond) {
                lastIssue = `2nd Follow-up: ${latestOrder.statusSecondFollowUp || 'Scheduled'}`;
            } else if (latestOrder.followUpFirst) {
                lastIssue = `1st Follow-up: ${latestOrder.quotationStatusFirstFollowUp || 'Completed'}${latestOrder.reasonOfQuotation ? ' - ' + latestOrder.reasonOfQuotation : ''}`;
            } else {
                lastIssue = latestOrder.issueDescription || latestOrder.issue || 'Order Created';
            }

        } else if (latestLead) {
            lastIssue = latestLead.issue || latestLead.notes || 'Lead Created';
            progress = latestLead.status ? `Lead: ${latestLead.status}` : 'New Lead';
        }

        return {
            ...c,
            progress,
            lastIssue,
        };
    }));



    return {
        data: enrichedData,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
        }
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

