import SalesData from '../models/sales-data.model';
import FollowUp from '../../customer/models/follow-up.model';
import { FollowUpStatus } from '../../customer/types/follow-up.types';
import SalesOrder from '../models/sales-order.model';
import { CreateSalesDataInput, UpdateSalesDataInput } from '../validation/sales-data.validation';
import { ISalesDataDocument } from '../types/sales-data.types';
import { OrderStatus } from '../types/sales-order.types';
import { AppError } from '../../../utils/apiError';

export const create = async (data: CreateSalesDataInput): Promise<ISalesDataDocument> =>
    SalesData.create(data);

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
            .populate('salesPerson', 'firstName lastName')
            .populate('customer', 'customerId name phone address region sector')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        SalesData.countDocuments(filter),
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1: Attach Lock State Flags for UI Lock Indicators
    // ─────────────────────────────────────────────────────────────────────────
    const dataWithLockFlags = await Promise.all(
        data.map(async (record) => {
            const recordObj: any = record.toObject();

            // Check FollowUp lock state
            if (recordObj.followUp === 'Yes') {
                const linkedFollowUp = await FollowUp.findOne({ salesDataId: record._id }).select('status');
                if (linkedFollowUp && linkedFollowUp.status !== FollowUpStatus.Pending) {
                    recordObj.isFollowUpLocked = true;
                }
            }

            // Check Order lock state (Broadened: ANY meaningful progression)
            if (recordObj.order === 'Yes') {
                const linkedOrder = await SalesOrder.findOne({ salesData: record._id })
                    .select('orderStatus quotationFileUrl isTechnicalInspectionRequired siteInspectionDate salesPlatform followUpFirst notes');
                if (linkedOrder) {
                    // An order is considered "Locked" (Actioned) if ANY progression field is filled
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

    // ─────────────────────────────────────────────────────────────────────────
    // Bi-directional Smart Sync Logic
    // ─────────────────────────────────────────────────────────────────────────

    const { followUp, order } = data;

    // --- FollowUp Sync Logic ---
    if (followUp !== undefined) {
        try {
            if (followUp === 'Yes') {
                // Create FollowUp if it doesn't exist
                const existingFollowUp = await FollowUp.findOne({ salesDataId: doc._id });
                if (!existingFollowUp) {
                    await FollowUp.create({
                        salesDataId: doc._id,
                        customer: doc.customer,
                        csr: doc.salesPerson,
                        status: FollowUpStatus.Pending,
                        solvedIssue: false,
                        followUpDate: doc.followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days
                    });
                }
            } else if (followUp === 'No') {
                // Explicit Validation Guard: Check if locked before attempting deletion
                const existingFollowUp = await FollowUp.findOne({ salesDataId: doc._id });
                if (existingFollowUp) {
                    if (existingFollowUp.status !== FollowUpStatus.Pending) {
                        // THROW EXPLICIT ERROR - Do not silently ignore
                        throw new AppError(
                            'Cannot change Follow-up to No. The team has already started working on it (Status: ' + existingFollowUp.status + ').',
                            400
                        );
                    }
                    // Only delete if status is still Pending
                    await FollowUp.findByIdAndDelete(existingFollowUp._id);
                }
            }
        } catch (err) {
            // Re-throw validation errors (AppError) - user must be notified
            if (err instanceof AppError) {
                throw err;
            }
            // Only log technical/database errors - main update succeeded, sync is secondary
            console.error('[SalesData Sync] FollowUp sync error:', err);
        }
    }

    // --- Order (SalesOrder) Sync Logic ---
    if (order !== undefined) {
        try {
            if (order === 'Yes') {
                // Create SalesOrder if it doesn't exist for this SalesData
                const existingOrder = await SalesOrder.findOne({ salesData: doc._id });
                if (!existingOrder) {
                    await SalesOrder.create({
                        salesData: doc._id,
                        customer: doc.customer,
                        salesPerson: doc.salesPerson, // Ensure order is linked to the logged-in user!
                        orderStatus: OrderStatus.Pending,
                        issueDescription: `Order from Sales Data Lead`,
                        typeOfOrder: doc.typeOfOrder,
                        salesPlatform: doc.salesPlatform,
                    });
                }
            } else if (order === 'No') {
                // Explicit Validation Guard: Check if locked before attempting deletion
                const existingOrder = await SalesOrder.findOne({ salesData: doc._id });
                if (existingOrder) {
                    // Broadened Protection: Check if ANY progression field has been filled
                    const hasProgressed =
                        !!existingOrder.quotationFileUrl ||
                        existingOrder.isTechnicalInspectionRequired === true ||
                        !!existingOrder.siteInspectionDate ||
                        !!existingOrder.salesPlatform ||
                        !!existingOrder.followUpFirst ||
                        existingOrder.orderStatus !== OrderStatus.Pending;

                    if (hasProgressed) {
                        // THROW EXPLICIT ERROR - Do not silently ignore
                        const reasons = [];
                        if (existingOrder.quotationFileUrl) reasons.push('quotation uploaded');
                        if (existingOrder.isTechnicalInspectionRequired) reasons.push('technical inspection required');
                        if (existingOrder.siteInspectionDate) reasons.push('site inspection scheduled');
                        if (existingOrder.salesPlatform) reasons.push('sales platform set');
                        if (existingOrder.followUpFirst) reasons.push('follow-up initiated');
                        if (existingOrder.orderStatus !== OrderStatus.Pending) reasons.push(`status: ${existingOrder.orderStatus}`);

                        throw new AppError(
                            `Cannot change Order to No. The Sales Order already contains: ${reasons.join(', ')}.`,
                            400
                        );
                    }
                    // Only delete if untouched
                    await SalesOrder.findByIdAndDelete(existingOrder._id);
                }
            }
        } catch (err) {
            // Re-throw validation errors (AppError) - user must be notified
            if (err instanceof AppError) {
                throw err;
            }
            // Only log technical/database errors - main update succeeded, sync is secondary
            console.error('[SalesData Sync] Order sync error:', err);
        }
    }

    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await SalesData.findByIdAndDelete(id);
    if (!doc) throw new AppError('Sales data record not found', 404);
};
