import SalesLead from '../models/sales-lead.model';
import SalesOrder from '../models/sales-order.model';
import Customer from '../../shared/models/contact.model';
import User from '../../auth/auth.model';
import { CreateSalesLeadInput, UpdateSalesLeadInput } from '../validation/sales-leads.validation';
import { ISalesLeadDocument, SalesLeadStatus } from '../types/sales-leads.types';
import { OrderStatus, ThirdFollowUpStatus } from '../types/sales-order.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateSalesLeadInput): Promise<ISalesLeadDocument> => {
    const doc = await SalesLead.create(data);

    if (doc.order === 'Yes') {
        try {
            console.log(`📦 Auto-creating SalesOrder during Lead POST for ${doc._id}`);

            let salesPersonId = null;
            if (doc.salesPerson) {
                const user = await User.findOne({
                    $or: [
                        { email: { $regex: new RegExp(`^${doc.salesPerson.trim()}$`, 'i') } },
                        { $expr: { $eq: [{ $concat: ['$firstName', ' ', '$lastName'] }, doc.salesPerson.trim()] } }
                    ]
                }).select('_id');
                if (user) salesPersonId = user._id;
            }

            await SalesOrder.create({
                salesLead: doc._id,
                customer: doc.customerId,
                salesPerson: salesPersonId,
                orderStatus: OrderStatus.Pending,
                issueDescription: doc.issue || 'Order created from new Sales Lead',
                typeOfOrder: '', // Safe enum fallback
                salesPlatform: '', // Safe enum fallback
            });
        } catch (createError) {
            console.error('❌ FATAL ERROR auto-creating Sales Order during Lead POST:', createError);
        }
    }

    return doc;
};

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, status, salesPerson, type, sector, excludeNo } = query;
    const filter: Record<string, unknown> = {};
    if (search) filter.$text = { $search: search as string };
    if (status) filter.status = status;
    if (salesPerson) filter.salesPerson = salesPerson;
    if (type) filter.type = type;
    if (sector) filter.sector = sector;
    if (excludeNo === 'true') filter.order = { $ne: 'No' };
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
    const { address, region, status: _s, salesPerson: _sp } = data;

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
    const newOrder = data.order;

    // Auto-tracking: if sales rep is adding issue, order, or reason
    const isAddingWorkData = data.issue || data.order || data.reason;

    // Set salesPerson from user info if adding work data and not already assigned
    // This tracks who first started working on this lead
    if (isAddingWorkData && userInfo && !doc.salesPerson) {
        (data as any).salesPerson = userInfo.email || userInfo.name || '';
    }

    // Auto-set status from New to Contacted if updating work fields
    if (doc.status === SalesLeadStatus.New && isAddingWorkData) {
        (data as any).status = SalesLeadStatus.Contacted;
    }

    // ═══════════════════════════════════════════════════════════════════
    // SALES ORDER AUTOMATION WORKFLOW
    // ═══════════════════════════════════════════════════════════════════

    // Detect if order field changed
    const orderChanged = newOrder !== undefined && newOrder !== previousOrder;

    if (orderChanged) {
        console.log(`🔄 Order field changed: "${previousOrder}" → "${newOrder}"`);

        // ── CASE: Changed to "Yes" ──────────────────────────────────────────────
        if (newOrder === 'Yes') {
            // Check if a SalesOrder already exists for this lead
            const existingOrder = await SalesOrder.findOne({ salesLead: doc._id });

            if (existingOrder) {
                console.log(`🔄 SalesOrder already exists for Lead ${doc._id}. Restoring to Pending.`);
                // Restore the order if it was previously canceled/not-potential
                existingOrder.orderStatus = OrderStatus.Pending;
                existingOrder.finalStatusThirdFollowUp = '';
                await existingOrder.save();
            } else {
                console.log(`📦 Creating new SalesOrder for Lead ${doc._id}`);
                
                // Map salesPerson from Lead (email/name string) to User ObjectId
                let salesPersonId = null;
                if (doc.salesPerson) {
                    const user = await User.findOne({
                        $or: [
                            { email: { $regex: new RegExp(`^${doc.salesPerson.trim()}$`, 'i') } },
                            { $expr: { $eq: [{ $concat: ['$firstName', ' ', '$lastName'] }, doc.salesPerson.trim()] } }
                        ]
                    }).select('_id');
                    if (user) salesPersonId = user._id;
                }

                const targetCustomerId = doc.customerId?._id || doc.customerId;

                try {
                    await SalesOrder.create({
                        salesLead: doc._id,
                        customer: targetCustomerId,
                        salesPerson: salesPersonId,
                        orderStatus: OrderStatus.Pending,
                        issueDescription: doc.issue || 'Order created from Sales Lead',
                        typeOfOrder: '',
                        salesPlatform: '',
                    });
                } catch (createError) {
                    console.error('❌ Error creating Sales Order:', createError);
                }
            }
        }

        // ── CASE: Changed to "No" (Archive to Non-Potential) ────────────────────
        else if (newOrder === 'No') {
            const existingOrder = await SalesOrder.findOne({ salesLead: doc._id });

            if (existingOrder) {
                console.log(`📦 Archiving SalesOrder for Lead ${doc._id} as Not Potential.`);
                // Instead of deleting, mark as canceled and not potential
                existingOrder.orderStatus = OrderStatus.Canceled;
                existingOrder.finalStatusThirdFollowUp = ThirdFollowUpStatus.NotPotential;
                await existingOrder.save();
            } else {
                console.log(`✨ Creating Archived SalesOrder for Lead ${doc._id}`);
                
                let salesPersonId = null;
                if (doc.salesPerson) {
                    const user = await User.findOne({
                        $or: [
                            { email: { $regex: new RegExp(`^${doc.salesPerson.trim()}$`, 'i') } },
                            { $expr: { $eq: [{ $concat: ['$firstName', ' ', '$lastName'] }, doc.salesPerson.trim()] } }
                        ]
                    }).select('_id');
                    if (user) salesPersonId = user._id;
                }

                try {
                    await SalesOrder.create({
                        salesLead: doc._id,
                        customer: doc.customerId?._id || doc.customerId,
                        salesPerson: salesPersonId,
                        orderStatus: OrderStatus.Canceled,
                        finalStatusThirdFollowUp: ThirdFollowUpStatus.NotPotential,
                        issueDescription: doc.issue || 'Lead marked as not potential',
                        typeOfOrder: '',
                        salesPlatform: '',
                    });
                    console.log('✅ Archive SalesOrder created successfully');
                } catch (err) {
                    console.error('❌ Failed to create Archived SalesOrder:', err);
                }
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════

    // Apply SalesLead-specific updates
    Object.assign(doc, data);
    if (newOrder !== undefined) doc.order = newOrder;
    
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
