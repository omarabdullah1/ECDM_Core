import Feedback from '../models/feedback.model';
import CustomerOrder from '../models/customer-order.model';
import { CreateFeedbackInput, UpdateFeedbackInput } from '../validation/feedback.validation';
import { IFeedbackDocument, IOrderContext } from '../types/feedback.types';
import { AppError } from '../../../utils/apiError';

const populateOrderContext = async (customerOrderId: string, customerId?: string): Promise<IOrderContext | undefined> => {
    const order = await CustomerOrder.findById(customerOrderId).populate('customerId', 'name phone customerId');
    if (!order) return undefined;
    
    const customer = order.customerId as unknown as { name?: string; phone?: string; customerId?: string };
    
    return {
        customerName: customer?.name || '',
        customerPhone: customer?.phone || '',
        customerId: customer?.customerId || String(customerId) || '',
        engineerName: order.engineerName || '',
        visitDate: order.actualVisitDate || order.scheduledVisitDate,
        scheduledVisitDate: order.scheduledVisitDate,
        actualVisitDate: order.actualVisitDate,
        startDate: order.startDate,
        endDate: order.endDate,
        dealStatus: order.deal || '',
        orderId: String(customerOrderId),
    };
};

export const create = async (data: CreateFeedbackInput): Promise<IFeedbackDocument> => {
    const orderContext = await populateOrderContext(data.customerOrderId, data.customerId);
    const payload = {
        ...data,
        orderContext,
    };
    return Feedback.create(payload);
};

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customerId, customerOrderId } = query;
    const filter: Record<string, unknown> = {};
    if (customerId)      filter.customerId      = customerId;
    if (customerOrderId) filter.customerOrderId = customerOrderId;
    
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Feedback.find(filter)
            .populate('customerId',      'customerId name phone region address')
            .populate('customerOrderId') // Crucial for Engineer name and dates
            .populate('updatedBy',       'email firstName lastName')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Feedback.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string): Promise<IFeedbackDocument> => {
    const doc = await Feedback.findById(id)
        .populate('customerId',      'customerId name phone region address')
        .populate('customerOrderId') // Crucial for Engineer name and dates
        .populate('updatedBy',       'email firstName lastName');
    if (!doc) throw new AppError('Feedback not found', 404);
    return doc;
};

export const update = async (id: string, data: UpdateFeedbackInput): Promise<IFeedbackDocument> => {
    const existing = await Feedback.findById(id);
    if (!existing) throw new AppError('Feedback not found', 404);
    
    const customerOrderId = data.customerOrderId || existing.customerOrderId?.toString();
    const customerId = data.customerId || existing.customerId?.toString();
    const orderContext = customerOrderId ? await populateOrderContext(customerOrderId, customerId) : undefined;
    
    const updateData = {
        ...data,
        orderContext: orderContext || existing.orderContext,
    };
    
    const doc = await Feedback.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!doc) throw new AppError('Feedback not found', 404);
    return doc;
};

export const remove = async (id: string): Promise<void> => {
    const doc = await Feedback.findByIdAndDelete(id);
    if (!doc) throw new AppError('Feedback not found', 404);
};

/**
 * Bulk delete multiple feedback records by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await Feedback.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};
