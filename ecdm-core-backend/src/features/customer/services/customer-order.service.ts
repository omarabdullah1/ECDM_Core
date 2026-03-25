import { AppError } from '../../../utils/apiError';
import CustomerOrder from '../models/customer-order.model';
import Feedback from '../models/feedback.model';
import FollowUp from '../models/follow-up.model';
import { ICustomerOrderDocument } from '../types/customer-order.types';
import { FollowUpStatus } from '../types/follow-up.types';
import { CreateCustomerOrderInput, UpdateCustomerOrderInput } from '../validation/customer-order.validation';

export const create = async (data: CreateCustomerOrderInput): Promise<ICustomerOrderDocument> => {
    // 1. Create the Customer Order
    const newCustomerOrder = await CustomerOrder.create(data);
    console.log('✅ Customer Order created:', newCustomerOrder._id);

    // 2. AUTOMATION: Create linked Follow-up Record
    try {
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 3); // Default: follow up after 3 days

        const newFollowUp = await FollowUp.create({
            customerOrderId: newCustomerOrder._id,
            customer: newCustomerOrder.customerId,
            status: FollowUpStatus.Pending,
            followUpDate,
            notes: 'Auto-generated from new customer order.',
        });
        console.log('✅ Follow-up record auto-created:', newFollowUp._id);
    } catch (error) {
        console.error('⚠️ Failed to auto-create Follow-up:', error);
        // Don't fail the entire operation if Follow-up creation fails
    }

    // 3. AUTOMATION: Create linked Feedback Record
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
        // Don't fail the entire operation if Feedback creation fails
    }

    return newCustomerOrder;
};

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customerId, deal, salesOrderId } = query;
    const filter: Record<string, unknown> = {};
    if (customerId)    filter.customerId    = customerId;
    if (deal)          filter.deal          = deal;
    if (salesOrderId)  filter.salesOrderId  = salesOrderId;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        CustomerOrder.find(filter)
            .populate('customerId',    'customerId name phone region sector address')
            .populate('salesOrderId',  'salesOrderId issueDescription quotationStatus finalStatus quotation')
            .populate('updatedBy',     'name email')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        CustomerOrder.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<ICustomerOrderDocument> => {
    const doc = await CustomerOrder.findById(id)
        .populate('customerId',    'customerId name phone region sector address email company')
        .populate('salesOrderId',  'salesOrderId issueDescription quotationStatus finalStatus siteInspectionDate quotation')
        .populate('updatedBy',     'name email');
    if (!doc) throw new AppError('Customer order not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateCustomerOrderInput): Promise<ICustomerOrderDocument> => {
    const doc = await CustomerOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) throw new AppError('Customer order not found', 404);

    // AUTOMATION: If order is now Approved, create a Follow-Up record (if not already existing)
    if (doc.status === 'Approved') {
        try {
            const existingFollowUp = await FollowUp.findOne({ customerOrderId: doc._id });
            if (!existingFollowUp) {
                const newFollowUp = await FollowUp.create({
                    customerOrderId: doc._id,
                    customer: doc.customerId,
                    status: FollowUpStatus.Pending,
                    followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days later
                });
                console.log('✅ Follow-up auto-created on order Approval:', newFollowUp._id);
            }
        } catch (error) {
            console.error('⚠️ Failed to auto-create Follow-up on order Approval:', error);
            // Don't fail the update if follow-up creation fails
        }
    }

    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await CustomerOrder.findByIdAndDelete(id);
    if (!doc) throw new AppError('Customer order not found', 404);
};

/**
 * Bulk delete multiple customer orders by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await CustomerOrder.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};
