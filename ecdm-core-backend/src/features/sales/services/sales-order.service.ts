import mongoose from 'mongoose';
import { AppError } from '../../../utils/apiError';
import { DealStatus } from '../../customer/types/customer-order.types';
import CustomerOrder from '../../customer/models/customer-order.model';
import Feedback from '../../customer/models/feedback.model';
import FollowUp from '../../customer/models/follow-up.model';
import { FollowUpStatus } from '../../customer/types/follow-up.types';
import WorkOrder from '../../operations/models/work-order.model';
import SalesOrder from '../models/sales-order.model';
import { ISalesOrderDocument } from '../types/sales-order.types';
import { CreateSalesOrderInput, UpdateSalesOrderInput } from '../validation/sales-order.validation';
import { updateCampaignRevenueFromSalesOrder } from '../../marketing/services/campaign-roi.service';
import { adjustStock, checkAvailability } from '../../operations/services/price-list.service';
import * as invoiceService from '../../finance/services/invoice.service';

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
            .populate('salesLead', 'issue typeOfOrder salesPlatform platform salesPerson')
            .populate('salesData', 'issue typeOfOrder salesPlatform callOutcome callDate salesPerson')
            .populate('salesPerson', '_id firstName lastName email')
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
        .populate('salesData', 'issue typeOfOrder salesPlatform callOutcome callDate salesPerson')
        .populate('salesPerson', '_id firstName lastName email');
    if (!doc) throw new AppError('Sales order not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateSalesOrderInput): Promise<ISalesOrderDocument> => {
    console.log('🔄 Service: Processing sales order update...');
    console.log('Raw input data:', JSON.stringify(data, null, 2));

    // Capture previous status for Campaign ROI tracking and automation triggers
    const previousOrder = await SalesOrder.findById(id).select('finalStatus quotationStatusFirstFollowUp statusSecondFollowUp finalStatusThirdFollowUp orderStatus');
    const previousFinalStatus = previousOrder?.finalStatus;
    const previousFirstFollowUpStatus = previousOrder?.quotationStatusFirstFollowUp;
    const previousSecondFollowUpStatus = previousOrder?.statusSecondFollowUp;
    const previousThirdFollowUpStatus = previousOrder?.finalStatusThirdFollowUp;
    const previousOrderStatus = previousOrder?.orderStatus;

    // ─── Business Logic: Invoice Approval Check ─────────────────────────────
    if ((data as any).orderStatus === 'Completed' && previousOrderStatus !== 'Completed') {
        const InvoiceModel = mongoose.model('FinanceInvoice');
        const invoice = await InvoiceModel.findOne({ salesOrderId: id, status: 'Approved' });
        if (!invoice) {
            throw new AppError('Cannot complete Sales Order: No approved invoice found for this order.', 400);
        }
    }


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

    // ─── Inventory Check: Prevent adding items with 0 stock or exceeding available quantity ───
    if (processedData.quotation?.items && processedData.quotation.items.length > 0) {
        const itemsToCheck = processedData.quotation.items
            .filter((item: any) => item.priceListId)
            .map((item: any) => ({
                priceListId: item.priceListId.toString(),
                quantity: item.quantity,
                itemName: item.description
            }));
        
        if (itemsToCheck.length > 0) {
            console.log('🛡️ Inventory: Checking availability for', itemsToCheck.length, 'items');
            await checkAvailability(itemsToCheck);
        }
    }

    const doc = await SalesOrder.findByIdAndUpdate(id, cleanedFields, { new: true, runValidators: true });
    if (!doc) throw new AppError('Sales order not found', 404);

    // ═════════════════════════════════════════════════════════════════════════
    // ROLE-AGNOSTIC AUTOMATION TRIGGER
    // When ANY of the three follow-up statuses changes to 'Accepted' or 'Scheduled', trigger automation
    // This works for Admin, Manager, AND Sales roles
    // ═════════════════════════════════════════════════════════════════════════
    const newFirstFollowUpStatus = processedData.quotationStatusFirstFollowUp;
    const newSecondFollowUpStatus = processedData.statusSecondFollowUp;
    const newThirdFollowUpStatus = processedData.finalStatusThirdFollowUp;

    const wasPositiveBefore = 
        (previousFirstFollowUpStatus as any) === 'Accepted' || (previousFirstFollowUpStatus as any) === 'Scheduled' ||
        (previousSecondFollowUpStatus as any) === 'Accepted' || (previousSecondFollowUpStatus as any) === 'Scheduled' ||
        (previousThirdFollowUpStatus as any) === 'Accepted' || (previousThirdFollowUpStatus as any) === 'Scheduled';

    const isPositiveNow = 
        (newFirstFollowUpStatus as any) === 'Accepted' || (newFirstFollowUpStatus as any) === 'Scheduled' ||
        (newSecondFollowUpStatus as any) === 'Accepted' || (newSecondFollowUpStatus as any) === 'Scheduled' ||
        (newThirdFollowUpStatus as any) === 'Accepted' || (newThirdFollowUpStatus as any) === 'Scheduled';

    const isPositiveTransition = !wasPositiveBefore && isPositiveNow;

    let populatedOrder: any = null;
    if (isPositiveTransition) {
        console.log('🎯 AUTOMATION TRIGGER: Positive status detected in follow-ups');
        console.log('   First:', newFirstFollowUpStatus, '| Second:', newSecondFollowUpStatus, '| Third:', newThirdFollowUpStatus);
        console.log('   This works for Admin, Manager, AND Sales roles');

        populatedOrder = await SalesOrder.findById(doc._id)
            .populate('salesLead')
            .populate('salesData')
            .populate('salesPerson', '_id firstName lastName email')
            .exec();

        if (populatedOrder) {
            const resolvedType = populatedOrder.typeOfOrder ||
                (populatedOrder.salesLead as any)?.typeOfOrder ||
                (populatedOrder.salesData as any)?.typeOfOrder || '';

            let resolvedIssue = populatedOrder.issue ||
                (populatedOrder.salesLead as any)?.issue ||
                (populatedOrder.salesData as any)?.issue || '';

            let finalCost = populatedOrder.quotation?.grandTotal || 0;

            if (populatedOrder.quotation?.items?.length) {
                const quotationItemsStr = populatedOrder.quotation.items.map((i: any) => `${i.quantity}x ${i.description}`).join(' | ');
                resolvedIssue = `[Quotation] ${quotationItemsStr} — ${resolvedIssue}`;
            }

            const existingCustomerOrder = await CustomerOrder.findOne({ salesOrderId: populatedOrder._id });

            if (existingCustomerOrder) {
                console.log('   📦 Customer Order already exists, syncing:', existingCustomerOrder._id);
                existingCustomerOrder.typeOfOrder = resolvedType;
                existingCustomerOrder.issue = resolvedIssue;
                existingCustomerOrder.deal = DealStatus.Pending;
                existingCustomerOrder.cost = finalCost;
                await existingCustomerOrder.save();
            } else {
                console.log('   ✨ Creating NEW Customer Order...');
                const newCustomerOrder = await CustomerOrder.create({
                    customerId: populatedOrder.customer,
                    salesOrderId: populatedOrder._id,
                    typeOfOrder: resolvedType,
                    issue: resolvedIssue,
                    cost: finalCost,
                    deal: DealStatus.Pending,
                    notes: 'Auto-generated from Sales Order - Positive follow-up status (Won).',
                    scheduledVisitDate: populatedOrder.siteInspectionDate,
                });

                try {
                    const followUpDate = new Date();
                    followUpDate.setDate(followUpDate.getDate() + 3);
                    await FollowUp.create({
                        customerOrderId: newCustomerOrder._id,
                        customer: newCustomerOrder.customerId,
                        status: FollowUpStatus.Pending,
                        followUpDate,
                        notes: 'Auto-generated from Sales Order conversion.',
                    });
                    console.log('   ✅ Follow-up record auto-created');
                } catch (error) {
                    console.error('   ⚠️ Failed to auto-create Follow-up:', error);
                }

                try {
                    await Feedback.create({
                        customerId: newCustomerOrder.customerId,
                        customerOrderId: newCustomerOrder._id,
                        solvedIssue: '',
                        ratingOperation: '',
                        followUp: '',
                        ratingCustomerService: '',
                        notes: '',
                    });
                    console.log('   ✅ Feedback record auto-created');
                } catch (error) {
                    console.error('   ⚠️ Failed to auto-create Feedback:', error);
                }

                try {
                    await WorkOrder.create({
                        customerOrderId: newCustomerOrder._id,
                    });
                    console.log('   ✅ Work Order auto-created');
                } catch (error) {
                    console.error('   ⚠️ Failed to auto-create Work Order:', error);
                }
            }

            console.log('   📊 Target Progress: Automatically calculated from accepted orders');
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // CONTINUOUS SYNC: Sequential Cascading Trigger (Customer Order → Work Order)
    // ═════════════════════════════════════════════════════════════════════════
    console.log('🔍 Starting sequential cascading sync...');
    console.log('📋 Sales Order ID:', doc._id);

    // Reuse populatedOrder if already fetched for Accepted trigger
    if (!populatedOrder) {
        populatedOrder = await SalesOrder.findById(doc._id)
            .populate('salesLead')
            .populate('salesData')
            .exec();
    }

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

        // 🎯 INVENTORY TRIGGER: Deduct stock when SalesOrder is marked as Won
        if (doc.quotation?.items && doc.quotation.items.length > 0) {
            console.log('📉 Inventory: Order WON - Deducting stock for', doc.quotation.items.length, 'items');
            for (const item of doc.quotation.items) {
                if (item.priceListId) {
                    try {
                        await adjustStock(item.priceListId.toString(), -item.quantity);
                    } catch (stockError) {
                        console.error(`⚠️ Failed to deduct stock for ${item.description}:`, (stockError as Error).message);
                    }
                }
            }
        }

        // 🎯 FINANCE TRIGGER: Generate Invoice when SalesOrder is marked as Won
        try {
            console.log('💰 Finance: Order WON - Generating Invoice...');
            await invoiceService.generateFromOrder(id);
        } catch (invoiceError) {
            console.error('⚠️ Failed to auto-generate Invoice:', (invoiceError as Error).message);
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
 * Trigger automation for Sales Order conversion.
 * Called by controller after maker-checker intercept saves the document directly.
 * This ensures automation runs regardless of whether update came via service or interceptor.
 * 
 * Logic: If ANY of the three follow-up statuses is 'Accepted' or 'Scheduled', trigger automation.
 */
export const triggerAutomationIfAccepted = async (salesOrderId: string): Promise<void> => {
    console.log('🔄 triggerAutomationIfAccepted: Checking for Accepted/Scheduled status...');

    const order = await SalesOrder.findById(salesOrderId);
    if (!order) {
        console.warn('   ⚠️ Sales order not found:', salesOrderId);
        return;
    }

    const isPositive = 
        (order.quotationStatusFirstFollowUp as any) === 'Accepted' ||
        (order.quotationStatusFirstFollowUp as any) === 'Scheduled' ||
        (order.statusSecondFollowUp as any) === 'Accepted' ||
        (order.statusSecondFollowUp as any) === 'Scheduled' ||
        (order.finalStatusThirdFollowUp as any) === 'Accepted' ||
        (order.finalStatusThirdFollowUp as any) === 'Scheduled';

    if (isPositive) {
        console.log('   🎯 Positive status detected - triggering automation...');
        console.log('      - First Follow-Up:', order.quotationStatusFirstFollowUp);
        console.log('      - Second Follow-Up:', order.statusSecondFollowUp);
        console.log('      - Third Follow-Up:', order.finalStatusThirdFollowUp);

        const populatedOrder = await SalesOrder.findById(salesOrderId)
            .populate('salesLead')
            .populate('salesData')
            .populate('salesPerson', '_id firstName lastName email')
            .exec();

        if (!populatedOrder) {
            console.warn('   ⚠️ Could not populate sales order');
            return;
        }

        const resolvedType = populatedOrder.typeOfOrder ||
            (populatedOrder.salesLead as any)?.typeOfOrder ||
            (populatedOrder.salesData as any)?.typeOfOrder || '';

        let resolvedIssue = populatedOrder.issue ||
            (populatedOrder.salesLead as any)?.issue ||
            (populatedOrder.salesData as any)?.issue || '';

        let finalCost = populatedOrder.quotation?.grandTotal || 0;

        if (populatedOrder.quotation?.items?.length) {
            const quotationItemsStr = populatedOrder.quotation.items.map((i: any) => `${i.quantity}x ${i.description}`).join(' | ');
            resolvedIssue = `[Quotation] ${quotationItemsStr} — ${resolvedIssue}`;
        }

        const existingCustomerOrder = await CustomerOrder.findOne({ salesOrderId: populatedOrder._id });

        if (existingCustomerOrder) {
            console.log('   📦 Customer Order already exists, syncing:', existingCustomerOrder._id);
            existingCustomerOrder.typeOfOrder = resolvedType;
            existingCustomerOrder.issue = resolvedIssue;
            existingCustomerOrder.deal = DealStatus.Pending;
            existingCustomerOrder.cost = finalCost;
            await existingCustomerOrder.save();
        } else {
            console.log('   ✨ Creating NEW Customer Order...');
            const newCustomerOrder = await CustomerOrder.create({
                customerId: populatedOrder.customer,
                salesOrderId: populatedOrder._id,
                typeOfOrder: resolvedType,
                issue: resolvedIssue,
                cost: finalCost,
                deal: DealStatus.Pending,
                notes: 'Auto-generated from Sales Order - Third follow-up Accepted (Won).',
                scheduledVisitDate: populatedOrder.siteInspectionDate,
            });

            try {
                const followUpDate = new Date();
                followUpDate.setDate(followUpDate.getDate() + 3);
                await FollowUp.create({
                    customerOrderId: newCustomerOrder._id,
                    customer: newCustomerOrder.customerId,
                    status: FollowUpStatus.Pending,
                    followUpDate,
                    notes: 'Auto-generated from Sales Order conversion.',
                });
                console.log('   ✅ Follow-up record auto-created');
            } catch (error) {
                console.error('   ⚠️ Failed to auto-create Follow-up:', error);
            }

            try {
                await Feedback.create({
                    customerId: newCustomerOrder.customerId,
                    customerOrderId: newCustomerOrder._id,
                    solvedIssue: '',
                    ratingOperation: '',
                    followUp: '',
                    ratingCustomerService: '',
                    notes: '',
                });
                console.log('   ✅ Feedback record auto-created');
            } catch (error) {
                console.error('   ⚠️ Failed to auto-create Feedback:', error);
            }

            try {
                await WorkOrder.create({
                    customerOrderId: newCustomerOrder._id,
                });
                console.log('   ✅ Work Order auto-created');
            } catch (error) {
                console.error('   ⚠️ Failed to auto-create Work Order:', error);
            }
        }

        console.log('   📊 Target Progress: Automatically calculated from accepted orders');
    } else {
        console.log('   ⏭️  Status is not Accepted, skipping automation');
    }
};

/**
 * Bulk delete multiple sales orders by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await SalesOrder.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};
