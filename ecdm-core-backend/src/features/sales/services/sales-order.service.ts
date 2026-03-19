import { AppError } from '../../../utils/apiError';
import CustomerOrder from '../../customer/models/customer-order.model';
import Feedback from '../../customer/models/feedback.model';
import FollowUp from '../../customer/models/follow-up.model';
import { FollowUpStatus } from '../../customer/types/follow-up.types';
import WorkOrder from '../../operations/models/work-order.model';
import SalesOrder from '../models/sales-order.model';
import { ISalesOrderDocument } from '../types/sales-order.types';
import { CreateSalesOrderInput, UpdateSalesOrderInput } from '../validation/sales-order.validation';
import { updateCampaignRevenueFromSalesOrder } from '../../marketing/services/campaign-roi.service';

export const create = async (data: CreateSalesOrderInput): Promise<ISalesOrderDocument> =>
    SalesOrder.create(data);

export const getAll = async (query: Record<string, unknown>, userId?: string, userRole?: string) => {
    const { page = 1, limit = 10, customer, quotationStatus, finalStatus, excludeNotPotential, onlyNotPotential } = query;
    const filter: Record<string, unknown> = {};

    // ═══════════════════════════════════════════════════════════════════
    // RBAC: All users can see all orders in the table. 
    // Editing restrictions are handled on the frontend (Read-Only mode).
    // ═══════════════════════════════════════════════════════════════════
    console.log(`👁️ User ${userId || 'Unknown'} (${userRole || 'Unknown'}) - viewing all orders`);

    if (customer) filter.customer = customer;
    if (quotationStatus) filter.quotationStatus = quotationStatus;
    if (finalStatus) filter.finalStatus = finalStatus;
    if (excludeNotPotential === 'true') filter.finalStatusThirdFollowUp = { $ne: 'Not Potential' };
    if (onlyNotPotential === 'true') filter.finalStatusThirdFollowUp = 'Not Potential';

    console.log('📊 SalesOrder Query Filter:', JSON.stringify(filter, null, 2));

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        SalesOrder.find(filter)
            .populate('customer', 'customerId name phone region sector')
            .populate('salesLead', 'issue typeOfOrder salesPlatform platform')
            .populate('salesData', 'issue typeOfOrder salesPlatform callOutcome callDate')
            .populate('salesPerson', 'firstName lastName email')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        SalesOrder.countDocuments(filter),
    ]);

    console.log(`✅ Found ${data.length} orders (total: ${total})`);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<ISalesOrderDocument> => {
    const doc = await SalesOrder.findById(id)
        .populate('customer', 'customerId name phone region sector email company address')
        .populate('salesLead', 'issue typeOfOrder salesPlatform platform order date salesPerson')
        .populate('salesData', 'issue typeOfOrder salesPlatform callOutcome callDate salesPerson');
    if (!doc) throw new AppError('Sales order not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateSalesOrderInput): Promise<ISalesOrderDocument> => {
    console.log('🔄 Service: Processing sales order update...');
    console.log('Raw input data:', JSON.stringify(data, null, 2));

    // Capture previous status for Campaign ROI tracking
    const previousOrder = await SalesOrder.findById(id).select('finalStatus');
    const previousFinalStatus = previousOrder?.finalStatus;

    // ═════════════════════════════════════════════════════════════════════════
    // Type Conversion Layer - FormData sends everything as strings
    // ═════════════════════════════════════════════════════════════════════════
    const processedData: any = { ...data };

    // ─── Parse Boolean: isTechnicalInspectionRequired ────────────────────────
    if (typeof processedData.isTechnicalInspectionRequired === 'string') {
        processedData.isTechnicalInspectionRequired = processedData.isTechnicalInspectionRequired === 'true';
        console.log('✓ Boolean conversion [isTechnicalInspectionRequired]:', processedData.isTechnicalInspectionRequired);
    }

    // ─── Clean Enum Fields: Remove empty strings (they fail validation) ──────
    const enumFields = ['quotationStatusFirstFollowUp', 'statusSecondFollowUp', 'finalStatusThirdFollowUp', 'quotationStatus', 'finalStatus'];
    enumFields.forEach(field => {
        if (processedData[field] === '' || processedData[field] === null) {
            delete processedData[field];
            console.log(`✓ Removed empty enum field [${field}]`);
        }
    });

    // ─── Parse Date Fields: Convert ISO strings to Date objects ──────────────
    const dateFields = [
        'siteInspectionDate',
        'technicalInspectionDate',
        'followUpFirst',
        'followUpSecond',
        'followUpThird'
    ];

    dateFields.forEach(field => {
        if (processedData[field]) {
            if (typeof processedData[field] === 'string') {
                const parsedDate = new Date(processedData[field]);
                if (!isNaN(parsedDate.getTime())) {
                    processedData[field] = parsedDate;
                    console.log(`✓ Date conversion [${field}]:`, parsedDate.toISOString());
                } else {
                    console.warn(`⚠️ Invalid date string for ${field}:`, processedData[field]);
                    delete processedData[field]; // Remove invalid dates
                }
            }
        } else if (processedData[field] === '' || processedData[field] === null) {
            // Handle clearing dates (empty string → null)
            processedData[field] = null;
            console.log(`✓ Cleared date field [${field}]`);
        }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // SSOT Protection: Explicitly prevent modification of upstream references
    // ═════════════════════════════════════════════════════════════════════════
    const allowedFields: Partial<UpdateSalesOrderInput> = {
        issue: processedData.issue,
        typeOfOrder: processedData.typeOfOrder,
        salesPlatform: processedData.salesPlatform,
        siteInspectionDate: processedData.siteInspectionDate,
        isTechnicalInspectionRequired: processedData.isTechnicalInspectionRequired,
        technicalInspectionDate: processedData.technicalInspectionDate,
        technicalInspectionDetails: processedData.technicalInspectionDetails,
        quotationFileUrl: processedData.quotationFileUrl,
        quotationFileName: processedData.quotationFileName,
        followUpFirst: processedData.followUpFirst,
        quotationStatusFirstFollowUp: processedData.quotationStatusFirstFollowUp,
        reasonOfQuotation: processedData.reasonOfQuotation,
        followUpSecond: processedData.followUpSecond,
        statusSecondFollowUp: processedData.statusSecondFollowUp,
        followUpThird: processedData.followUpThird,
        finalStatusThirdFollowUp: processedData.finalStatusThirdFollowUp,
        quotationStatus: processedData.quotationStatus,
        finalStatus: processedData.finalStatus,
        notes: processedData.notes,
        quotation: processedData.quotation,
    };

    // Remove undefined values to prevent MongoDB validation errors
    const cleanedFields = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );

    console.log('✓ Processed fields ready for DB:', JSON.stringify(cleanedFields, null, 2));

    const doc = await SalesOrder.findByIdAndUpdate(id, cleanedFields, { new: true, runValidators: true });
    if (!doc) throw new AppError('Sales order not found', 404);

    // ═════════════════════════════════════════════════════════════════════════
    // CONTINUOUS SYNC: Sequential Cascading Trigger (Customer Order → Work Order)
    // ═════════════════════════════════════════════════════════════════════════
    console.log('🔍 Starting sequential cascading sync...');
    console.log('📋 Sales Order ID:', doc._id);

    // STEP 1: Force fully populated fetch of the Sales Order
    const populatedOrder = await SalesOrder.findById(doc._id)
        .populate('salesLead')
        .populate('salesData')
        .exec();

    if (!populatedOrder) {
        console.warn('⚠️ Could not populate sales order for cascading sync');
        return doc;
    }

    console.log('📋 Population complete - siteInspectionDate:', populatedOrder.siteInspectionDate);

    // Evaluate Positive Follow-Up Statuses
    const positiveStatuses = ['Accepted', 'Scheduled'];
    const isPositive =
        positiveStatuses.includes(populatedOrder.quotationStatusFirstFollowUp as any) ||
        positiveStatuses.includes(populatedOrder.statusSecondFollowUp as any) ||
        positiveStatuses.includes(populatedOrder.finalStatusThirdFollowUp as any);

    // Only proceed with cascading if siteInspectionDate is set OR follow-up is positive
    if (populatedOrder.siteInspectionDate || isPositive) {
        console.log(`✅ Cascade Triggered. siteInspectionDate: ${!!populatedOrder.siteInspectionDate}, isPositive: ${isPositive}`);

        // STEP 2: Resolve inherited values (priority: order > lead > data)
        const resolvedType = populatedOrder.typeOfOrder ||
            (populatedOrder.salesLead as any)?.typeOfOrder ||
            (populatedOrder.salesData as any)?.typeOfOrder ||
            '';

        let resolvedIssue = populatedOrder.issue ||
            (populatedOrder.salesLead as any)?.issue ||
            (populatedOrder.salesData as any)?.issue ||
            '';

        let finalCost = 0;

        // Inherit quotation items into the issue field if this is auto-generated from positive status
        if (isPositive && populatedOrder.quotation?.items?.length) {
            const quotationItemsStr = populatedOrder.quotation.items.map((i: any) => `${i.quantity}x ${i.description}`).join(' | ');
            resolvedIssue = `[Quotation] ${quotationItemsStr} — ${resolvedIssue}`;
            finalCost = populatedOrder.quotation.grandTotal || 0;
        }

        console.log('📦 Resolved values:', { resolvedType, resolvedIssue, finalCost });

        // STEP 3: Sync or Create Customer Order FIRST (sequential, blocking)
        let targetCustomerOrderId;

        const existingCustomerOrder = await CustomerOrder.findOne({ salesOrderId: populatedOrder._id });

        if (existingCustomerOrder) {
            console.log('📦 Found existing Customer Order:', existingCustomerOrder._id);
            // ALWAYS UPDATE (Continuous Sync)
            existingCustomerOrder.typeOfOrder = resolvedType;
            existingCustomerOrder.issue = resolvedIssue;
            existingCustomerOrder.scheduledVisitDate = populatedOrder.siteInspectionDate;
            if (isPositive && finalCost > 0) {
                existingCustomerOrder.cost = finalCost;
            }
            await existingCustomerOrder.save();

            targetCustomerOrderId = existingCustomerOrder._id; // Securely capture ID
            console.log('✅ Customer Order synced, captured ID:', targetCustomerOrderId);
        } else {
            console.log('✨ Creating NEW Customer Order...');
            const newCustomerOrder = await CustomerOrder.create({
                customerId: populatedOrder.customer,
                salesOrderId: populatedOrder._id,
                typeOfOrder: resolvedType,
                issue: resolvedIssue,
                cost: finalCost,
                deal: isPositive ? 'Pending' : undefined,
                notes: isPositive ? 'Auto-generated from Sales Order. Follow-up status was positive.' : '',
                scheduledVisitDate: populatedOrder.siteInspectionDate,
            });

            targetCustomerOrderId = newCustomerOrder._id; // Securely capture ID
            console.log('✅ Customer Order created, captured ID:', targetCustomerOrderId);

            // ═════════════════════════════════════════════════════════════════════════
            // AUTOMATION: Auto-create Follow-up and Feedback records for new Customer Order
            // ═════════════════════════════════════════════════════════════════════════
            try {
                const followUpDate = new Date();
                followUpDate.setDate(followUpDate.getDate() + 3); // Default: follow up after 3 days

                const newFollowUp = await FollowUp.create({
                    customerOrderId: newCustomerOrder._id,
                    customer: newCustomerOrder.customerId,
                    status: FollowUpStatus.Pending,
                    followUpDate,
                    notes: 'Auto-generated from Sales Order conversion.',
                });
                console.log('✅ Follow-up record auto-created:', newFollowUp._id);
            } catch (error) {
                console.error('⚠️ Failed to auto-create Follow-up:', error);
            }

            try {
                const newFeedback = await Feedback.create({
                    customerId: newCustomerOrder.customerId,
                    customerOrderId: newCustomerOrder._id,
                    solvedIssue: '',
                    ratingOperation: '',
                    followUp: '',
                    ratingCustomerService: '',
                    notes: '',
                });
                console.log('✅ Feedback record auto-created:', newFeedback._id);
            } catch (error) {
                console.error('⚠️ Failed to auto-create Feedback:', error);
            }
        }

        // STEP 4: CASCADE TO WORK ORDER (using the securely captured ID)
        if (targetCustomerOrderId) {
            console.log('🔄 Cascading to Work Order with Customer Order ID:', targetCustomerOrderId);

            const existingWorkOrder = await WorkOrder.findOne({ customerOrderId: targetCustomerOrderId });

            if (!existingWorkOrder) {
                try {
                    const newWorkOrder = await WorkOrder.create({
                        customerOrderId: targetCustomerOrderId,
                        // All other fields remain empty for the maintenance team to fill
                    });
                    console.log('✅ SUCCESS: Work Order created:', newWorkOrder._id);
                    console.log('   - Linked to Customer Order:', targetCustomerOrderId);
                } catch (workOrderError) {
                    console.error('❌ CRITICAL: Failed to create Work Order:', workOrderError);
                    console.error('   - Target Customer Order ID:', targetCustomerOrderId);
                    console.error('   - Error details:', (workOrderError as Error).message);
                }
            } else {
                console.log('ℹ️ Work Order already exists:', existingWorkOrder._id);
            }
        } else {
            console.error('❌ CRITICAL: No targetCustomerOrderId captured!');
        }
    } else {
        console.log('ℹ️ No siteInspectionDate set, skipping cascade');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // CAMPAIGN ROI TRACKING: Update Campaign revenue when Order is Won
    // ═════════════════════════════════════════════════════════════════════════
    const newFinalStatus = processedData.finalStatus;
    if (previousFinalStatus !== 'Won' && newFinalStatus === 'Won') {
        console.log('🎯 Campaign ROI Trigger: SalesOrder marked as Won');
        try {
            const campaignUpdate = await updateCampaignRevenueFromSalesOrder(id);
            if (campaignUpdate) {
                console.log(`   → Campaign "${campaignUpdate.campaignName}" revenue: +${campaignUpdate.addedRevenue}`);
            } else {
                console.log('   → No associated Campaign found for this SalesOrder');
            }
        } catch (campaignError) {
            console.error('⚠️ Failed to update Campaign revenue:', campaignError);
        }
    }

    console.log('✅ Service: Sales order updated successfully');
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await SalesOrder.findByIdAndDelete(id);
    if (!doc) throw new AppError('Sales order not found', 404);
};

/**
 * Bulk delete multiple sales orders by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await SalesOrder.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};
