import SalesLead from '../models/sales-lead.model';
import SalesOrder from '../models/sales-order.model';
import Customer from '../../shared/models/contact.model';
import { CreateSalesLeadInput, UpdateSalesLeadInput } from '../validation/sales-leads.validation';
import { ISalesLeadDocument, SalesLeadStatus } from '../types/sales-leads.types';
import { OrderStatus } from '../types/sales-order.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateSalesLeadInput): Promise<ISalesLeadDocument> =>
    SalesLead.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, status, salesPerson, type, sector } = query;
    const filter: Record<string, unknown> = {};
    if (search)      filter.$text       = { $search: search as string };
    if (status)      filter.status      = status;
    if (salesPerson) filter.salesPerson = salesPerson;
    if (type)        filter.type        = type;
    if (sector)      filter.sector      = sector;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        SalesLead.find(filter)
            .populate('customerId', 'customerId name phone type sector email company address region')
            .populate('marketingLeadId', 'date notes')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        SalesLead.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<ISalesLeadDocument> => {
    const doc = await SalesLead.findById(id)
        .populate('customerId', 'customerId name phone type sector email company address region notes')
        .populate('marketingLeadId', 'date notes campaign assignedTo');
    if (!doc) throw new AppError('Sales lead not found', 404);
    return doc;
};

/**
 * Updates a SalesLead with automated SalesOrder workflow.
 * 
 * When the `order` field changes:
 * - "Yes": Automatically creates a new SalesOrder (if none exists) linked to this lead
 * - "No": Checks if the associated SalesOrder is in 'Pending' status:
 *   - If Pending: Safely deletes the SalesOrder and updates the lead
 *   - If NOT Pending (Quoted, In Progress, etc.): Aborts with 400 error
 */
export const update = async (id: string, data: UpdateSalesLeadInput, userInfo?: { email?: string; name?: string }): Promise<ISalesLeadDocument> => {
    const doc = await SalesLead.findById(id).populate('customerId');
    if (!doc) throw new AppError('Sales lead not found', 404);

    // ══════════════════════════════════════════════════════════════════════════
    // DUAL UPDATE: Separate Customer fields from SalesLead fields
    // ══════════════════════════════════════════════════════════════════════════
    const { address, region, ...salesLeadData } = data;
    
    // Update Customer (SSOT) if address or region provided
    if (address !== undefined || region !== undefined) {
        const customerUpdate: Record<string, unknown> = {};
        if (address !== undefined) customerUpdate.address = address;
        if (region !== undefined) customerUpdate.region = region;
        
        await Customer.findByIdAndUpdate(doc.customerId, customerUpdate, {
            runValidators: true,
        });
    }

    // Store the previous order value to detect changes
    const previousOrder = doc.order;
    const newOrder = salesLeadData.order;

    // Auto-tracking: if sales rep is adding issue, order, or reason
    const isAddingWorkData = salesLeadData.issue || salesLeadData.order || salesLeadData.reason;

    // Set salesPerson from user info if adding work data and not already set
    if (isAddingWorkData && userInfo) {
        salesLeadData.salesPerson = userInfo.email || userInfo.name || '';
    }

    // Auto-set status from New to Contacted if updating work fields
    if (doc.status === SalesLeadStatus.New && isAddingWorkData) {
        salesLeadData.status = SalesLeadStatus.Contacted;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SALES ORDER AUTOMATION WORKFLOW
    // ══════════════════════════════════════════════════════════════════════════

    // Detect if order field changed
    const orderChanged = newOrder !== undefined && newOrder !== previousOrder;
    
    if (orderChanged) {
        // ── CASE: Changed to "Yes" ──────────────────────────────────────────────
        if (newOrder === 'Yes') {
            // Check if a SalesOrder already exists for this lead
            const existingOrder = await SalesOrder.findOne({ salesLead: doc._id });
            
            if (!existingOrder) {
                // Create a new SalesOrder linked to this lead
                await SalesOrder.create({
                    salesLead:        doc._id,
                    customer:         doc.customerId,
                    orderStatus:      OrderStatus.Pending,
                    issueDescription: doc.issue || 'Order created from Sales Lead',
                });
            }
        }
        
        // ── CASE: Changed to "No" (THE GUARD CONDITION) ─────────────────────────
        else if (newOrder === 'No') {
            // Find the associated SalesOrder
            const existingOrder = await SalesOrder.findOne({ salesLead: doc._id });
            
            if (existingOrder) {
                // GUARD: Only allow cancellation if order is still Pending
                if (existingOrder.orderStatus !== OrderStatus.Pending) {
                    throw new AppError(
                        'Action already taken on the Sales Order. Cannot revert to No.',
                        400
                    );
                }
                
                // Safe to delete - order is still in Pending status
                await SalesOrder.findByIdAndDelete(existingOrder._id);
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════

    // Apply SalesLead-specific updates
    Object.assign(doc, salesLeadData);
    await doc.save();
    
    // Re-populate to return fresh data with updated Customer fields
    await doc.populate('customerId', 'customerId name phone type sector email company address region notes');
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await SalesLead.findByIdAndDelete(id);
    if (!doc) throw new AppError('Sales lead not found', 404);
};

/**
 * Bulk delete multiple sales leads by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await SalesLead.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};
