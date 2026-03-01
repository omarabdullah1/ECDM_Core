import SalesOrder from '../models/sales-order.model';
import { CreateSalesOrderInput, UpdateSalesOrderInput } from '../validation/sales-order.validation';
import { ISalesOrderDocument } from '../types/sales-order.types';
import { AppError } from '../../../utils/apiError';
import CustomerOrder from '../../customer/models/customer-order.model';

export const create = async (data: CreateSalesOrderInput): Promise<ISalesOrderDocument> =>
    SalesOrder.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, quotationStatus, finalStatus } = query;
    const filter: Record<string, unknown> = {};
    if (customer)        filter.customer        = customer;
    if (quotationStatus) filter.quotationStatus = quotationStatus;
    if (finalStatus)     filter.finalStatus     = finalStatus;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        SalesOrder.find(filter)
            .populate('customer',  'customerId name phone region sector')
            .populate('salesLead', 'issue typeOfOrder salesPlatform platform')
            .populate('salesData', 'issue typeOfOrder salesPlatform callOutcome callDate')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        SalesOrder.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<ISalesOrderDocument> => {
    const doc = await SalesOrder.findById(id)
        .populate('customer',  'customerId name phone region sector email company address')
        .populate('salesLead', 'issue typeOfOrder salesPlatform platform order date salesPerson')
        .populate('salesData', 'issue typeOfOrder salesPlatform callOutcome callDate salesPerson');
    if (!doc) throw new AppError('Sales order not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateSalesOrderInput): Promise<ISalesOrderDocument> => {
    console.log('🔄 Service: Processing sales order update...');
    console.log('Raw input data:', JSON.stringify(data, null, 2));
    
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
        issue:                      processedData.issue,
        typeOfOrder:                processedData.typeOfOrder,
        salesPlatform:              processedData.salesPlatform,
        siteInspectionDate:         processedData.siteInspectionDate,
        isTechnicalInspectionRequired: processedData.isTechnicalInspectionRequired,
        technicalInspectionDate:    processedData.technicalInspectionDate,
        technicalInspectionDetails: processedData.technicalInspectionDetails,
        quotationFileUrl:           processedData.quotationFileUrl,
        quotationFileName:          processedData.quotationFileName,
        followUpFirst:              processedData.followUpFirst,
        quotationStatusFirstFollowUp: processedData.quotationStatusFirstFollowUp,
        reasonOfQuotation:          processedData.reasonOfQuotation,
        followUpSecond:             processedData.followUpSecond,
        statusSecondFollowUp:       processedData.statusSecondFollowUp,
        followUpThird:              processedData.followUpThird,
        finalStatusThirdFollowUp:   processedData.finalStatusThirdFollowUp,
        quotationStatus:            processedData.quotationStatus,
        finalStatus:                processedData.finalStatus,
        notes:                      processedData.notes,
    };
    
    // Remove undefined values to prevent MongoDB validation errors
    const cleanedFields = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    console.log('✓ Processed fields ready for DB:', JSON.stringify(cleanedFields, null, 2));
    
    const doc = await SalesOrder.findByIdAndUpdate(id, cleanedFields, { new: true, runValidators: true });
    if (!doc) throw new AppError('Sales order not found', 404);
    
    // ═════════════════════════════════════════════════════════════════════════
    // CONTINUOUS SYNC: Always sync to Customer Order if it exists
    // ═════════════════════════════════════════════════════════════════════════
    console.log('🔍 Checking for existing Customer Order to sync...');
    console.log('📋 Sales Order ID:', doc._id);
    console.log('📋 Sales Order typeOfOrder (before population):', doc.typeOfOrder);
    console.log('📋 Sales Order issue (before population):', doc.issue);
    
    // 1. Force a fresh, FULLY POPULATED fetch of the Sales Order
    const populatedOrder = await SalesOrder.findById(doc._id)
        .populate('salesLead')
        .populate('salesData')
        .exec();
    
    if (!populatedOrder) {
        console.warn('⚠️ Could not populate sales order for Customer Order sync');
        return doc;
    }
    
    console.log('📋 After Population:');
    console.log('  - typeOfOrder:', populatedOrder.typeOfOrder);
    console.log('  - issue:', populatedOrder.issue);
    console.log('  - salesLead populated:', !!populatedOrder.salesLead);
    console.log('  - salesData populated:', !!populatedOrder.salesData);
    if (populatedOrder.salesLead) {
        console.log('  - salesLead.typeOfOrder:', (populatedOrder.salesLead as any)?.typeOfOrder);
        console.log('  - salesLead.issue:', (populatedOrder.salesLead as any)?.issue);
    }
    if (populatedOrder.salesData) {
        console.log('  - salesData.typeOfOrder:', (populatedOrder.salesData as any)?.typeOfOrder);
        console.log('  - salesData.issue:', (populatedOrder.salesData as any)?.issue);
    }
    
    // 2. Resolve inherited values (priority: order > lead > data)
    const resolvedType = populatedOrder.typeOfOrder || 
                        (populatedOrder.salesLead as any)?.typeOfOrder || 
                        (populatedOrder.salesData as any)?.typeOfOrder || 
                        '';
    
    const resolvedIssue = populatedOrder.issue || 
                         (populatedOrder.salesLead as any)?.issue || 
                         (populatedOrder.salesData as any)?.issue || 
                         '';
    
    console.log('✅ Resolved Values:');
    console.log('  - resolvedType:', resolvedType);
    console.log('  - resolvedIssue:', resolvedIssue);
    
    // 3. Check for existing Customer Order
    const existingCustomerOrder = await CustomerOrder.findOne({ salesOrderId: populatedOrder._id });
    
    if (existingCustomerOrder) {
        console.log('📦 Found existing Customer Order:', existingCustomerOrder._id);
        console.log('  - Current typeOfOrder:', existingCustomerOrder.typeOfOrder);
        console.log('  - Current issue:', existingCustomerOrder.issue);
        
        // ALWAYS UPDATE if it exists (Continuous Sync)
        existingCustomerOrder.typeOfOrder = resolvedType;
        existingCustomerOrder.issue = resolvedIssue;
        // Only sync date if it exists in the Sales Order payload
        if (populatedOrder.siteInspectionDate) {
            existingCustomerOrder.scheduledVisitDate = populatedOrder.siteInspectionDate;
        }
        await existingCustomerOrder.save();
        
        console.log('🔄 Successfully synced POPULATED data to Customer Order.');
        console.log('  - Updated typeOfOrder:', existingCustomerOrder.typeOfOrder);
        console.log('  - Updated issue:', existingCustomerOrder.issue);
    } else if (populatedOrder.siteInspectionDate) {
        console.log('✨ No existing Customer Order found, creating new one...');
        // CREATE ONLY if it doesn't exist AND an inspection date was just added
        try {
            const newOrder = await CustomerOrder.create({
                customerId: populatedOrder.customer,
                salesOrderId: populatedOrder._id,
                typeOfOrder: resolvedType,
                issue: resolvedIssue,
                scheduledVisitDate: populatedOrder.siteInspectionDate,
                // Keep other fields at default/empty for the engineer to fill
            });
            console.log('✅ Created NEW Customer Order with populated data:', newOrder._id);
            console.log('  - typeOfOrder:', newOrder.typeOfOrder);
            console.log('  - issue:', newOrder.issue);
        } catch (createError) {
            console.error('❌ Failed to create Customer Order:', createError);
            // Don't fail the sales order update if customer order creation fails
        }
    } else {
        console.log('ℹ️ No Customer Order exists and no siteInspectionDate set, skipping creation.');
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
