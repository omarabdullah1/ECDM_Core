import SalesData from '../models/sales-data.model';
import FollowUp from '../../customer/models/follow-up.model';
import { FollowUpStatus } from '../../customer/types/follow-up.types';
import SalesOrder from '../models/sales-order.model';
import { CreateSalesDataInput, UpdateSalesDataInput } from '../validation/sales-data.validation';
import { ISalesDataDocument } from '../types/sales-data.types';
import { OrderStatus } from '../types/sales-order.types';
import { AppError } from '../../../utils/apiError';
import Customer from '../../shared/models/contact.model';
import * as customerService from '../../shared/services/customer.service';
import { CustomerType } from '../../shared/types/contact.types';

/**
 * Normalize phone number for consistent matching
 */
const normalizePhone = (phone: string): string => {
    return phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
};

/**
 * Unified logic to sync SalesData state with Order and FollowUp modules
 */
const syncSalesDataState = async (doc: ISalesDataDocument, fields: { followUp?: string, order?: string }) => {
    const { followUp, order } = fields;

    // --- FollowUp Sync Logic ---
    if (followUp !== undefined) {
        if (followUp === 'Yes') {
            const existingFollowUp = await FollowUp.findOne({ salesDataId: doc._id });
            if (!existingFollowUp) {
                await FollowUp.create({
                    salesDataId: doc._id,
                    customer: doc.customer,
                    csr: doc.salesPerson,
                    status: FollowUpStatus.Pending,
                    solvedIssue: '',
                    followUpDate: doc.followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days
                });
                console.log(`✅ Follow-up auto-created for SalesData: ${doc._id}`);
            }
        } else if (followUp === 'No') {
            const existingFollowUp = await FollowUp.findOne({ salesDataId: doc._id });
            if (existingFollowUp) {
                if (existingFollowUp.status !== FollowUpStatus.Pending) {
                    throw new AppError(
                        'Cannot change Follow-up to No. The team has already started working on it (Status: ' + existingFollowUp.status + ').',
                        400
                    );
                }
                await FollowUp.findByIdAndDelete(existingFollowUp._id);
            }
        }
    }

    // --- Order (SalesOrder) Sync Logic ---
    if (order !== undefined) {
        if (order === 'Yes') {
            const existingOrder = await SalesOrder.findOne({ salesData: doc._id });
            if (!existingOrder) {
                await SalesOrder.create({
                    salesData: doc._id,
                    customer: doc.customer,
                    salesPerson: doc.salesPerson,
                    orderStatus: OrderStatus.Pending,
                    issueDescription: `Order from Sales Data Lead`,
                    typeOfOrder: doc.typeOfOrder,
                    salesPlatform: doc.salesPlatform,
                });
                console.log(`✅ Sales Order auto-created for SalesData: ${doc._id}`);
            }
        } else if (order === 'No') {
            const existingOrder = await SalesOrder.findOne({ salesData: doc._id });
            if (existingOrder) {
                const hasProgressed =
                    !!existingOrder.quotationFileUrl ||
                    existingOrder.isTechnicalInspectionRequired === true ||
                    !!existingOrder.siteInspectionDate ||
                    !!existingOrder.salesPlatform ||
                    !!existingOrder.followUpFirst ||
                    existingOrder.orderStatus !== OrderStatus.Pending;

                if (hasProgressed) {
                    throw new AppError(
                        `Cannot change Order to No. The Sales Order has already progressed and cannot be deleted.`,
                        400
                    );
                }
                await SalesOrder.findByIdAndDelete(existingOrder._id);
            }
        }
    }
};

export const create = async (payload: CreateSalesDataInput): Promise<ISalesDataDocument> => {
    let customerId = payload.customer;

    // --- STEP 1: Customer Resolution ---
    // If no customer ID is provided, try to find or create by phone
    if (!customerId && payload.customerPhone) {
        const normalizedPhone = normalizePhone(payload.customerPhone);
        
        // Search for existing customer
        const existingCustomer = await Customer.findOne({ phone: normalizedPhone });
        
        if (existingCustomer) {
            customerId = existingCustomer._id.toString();
            console.log(`🔗 Linked to existing customer: ${existingCustomer.customerId} (${normalizedPhone})`);
        } else {
            // Create brand new customer
            if (!payload.customerName) {
                throw new AppError('Customer Name is required for new leads', 400);
            }

            const nextId = await customerService.getNextCustomerId();
            const newCustomer = await Customer.create({
                customerId: nextId,
                name: payload.customerName,
                phone: normalizedPhone,
                address: payload.customerAddress,
                region: payload.customerRegion,
                sector: payload.customerSector,
                type: CustomerType.Other, // Default source for manual sales data
            });
            customerId = newCustomer._id.toString();
            console.log(`✨ Created new customer: ${nextId} (${normalizedPhone})`);
        }
    }

    if (!customerId) {
        throw new AppError('Customer reference or phone number is required', 400);
    }

    // --- STEP 2: Create SalesData ---
    const record = await SalesData.create({
        ...payload,
        customer: customerId
    });
    console.log('✅ Sales Data record created:', record._id);

    // --- STEP 3: Sync Modules ---
    await syncSalesDataState(record, { 
        followUp: payload.followUp, 
        order: payload.order 
    });

    return record;
};

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, salesPerson, callOutcome, marketingData } = query;
    const filter: Record<string, unknown> = {};
    if (salesPerson) filter.salesPerson = salesPerson;
    if (callOutcome) filter.callOutcome = callOutcome;
    if (marketingData) filter.marketingData = marketingData;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        SalesData.find(filter)
            .populate('marketingData', 'name phone dataSource uploadBatch')
            .populate('salesPerson', 'firstName lastName email')
            .populate('customer', 'customerId name phone address region sector')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        SalesData.countDocuments(filter),
    ]);

    // Attach Lock State Flags for UI
    const dataWithLockFlags = await Promise.all(
        data.map(async (record) => {
            const recordObj: any = record.toObject();

            if (recordObj.followUp === 'Yes') {
                const linkedFollowUp = await FollowUp.findOne({ salesDataId: record._id }).select('status');
                if (linkedFollowUp && linkedFollowUp.status !== FollowUpStatus.Pending) {
                    recordObj.isFollowUpLocked = true;
                }
            }

            if (recordObj.order === 'Yes') {
                const linkedOrder = await SalesOrder.findOne({ salesData: record._id })
                    .select('orderStatus quotationFileUrl isTechnicalInspectionRequired siteInspectionDate salesPlatform followUpFirst notes');
                if (linkedOrder) {
                    const hasProgressed =
                        linkedOrder.orderStatus !== OrderStatus.Pending ||
                        !!linkedOrder.quotationFileUrl ||
                        linkedOrder.isTechnicalInspectionRequired === true ||
                        !!linkedOrder.siteInspectionDate ||
                        !!linkedOrder.salesPlatform ||
                        !!linkedOrder.followUpFirst ||
                        !!linkedOrder.notes;
                    if (hasProgressed) {
                        recordObj.isOrderLocked = true;
                    }
                }
            }

            return recordObj;
        })
    );

    return {
        data: dataWithLockFlags,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    };
};

export const getById = async (id: string): Promise<ISalesDataDocument> => {
    const doc = await SalesData.findById(id)
        .populate('marketingData', 'name phone company sector dataSource uploadBatch')
        .populate('salesPerson', 'firstName lastName email')
        .populate('customer', 'customerId name phone address region sector');
    if (!doc) throw new AppError('Sales data record not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateSalesDataInput): Promise<ISalesDataDocument> => {
    const doc = await SalesData.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Sales data record not found', 404);

    // Sync state changes
    await syncSalesDataState(doc, { 
        followUp: data.followUp, 
        order: data.order 
    });

    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await SalesData.findByIdAndDelete(id);
    if (!doc) throw new AppError('Sales data record not found', 404);
};

export const bulkRemove = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await SalesData.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

