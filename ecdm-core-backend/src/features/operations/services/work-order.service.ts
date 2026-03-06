import WorkOrder from '../models/work-order.model';
import { AppError } from '../../../utils/apiError';
import { CreateWorkOrderInput, UpdateWorkOrderInput } from '../validation/work-order.validation';

/**
 * Work Order Service - Maintenance/Workshop Module
 * 
 * Handles CRUD operations for Work Orders.
 * Uses deep population to show inherited data from CustomerOrder → Customer chain.
 */

export const create = async (data: CreateWorkOrderInput) => WorkOrder.create(data);

/**
 * GET ALL Work Orders with deep population
 * Populates: customerOrderId → customerId (for displaying the 28-column table)
 */
export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customerOrderId, maintenanceEngineer, punctuality, taskCompleted } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (customerOrderId)     filter.customerOrderId     = customerOrderId;
    if (maintenanceEngineer) filter.maintenanceEngineer = { $regex: maintenanceEngineer, $options: 'i' };
    if (punctuality)         filter.punctuality         = punctuality;
    if (taskCompleted)       filter.taskCompleted       = taskCompleted;

    const [data, total] = await Promise.all([
        WorkOrder.find(filter)
            .populate({
                path: 'customerOrderId',
                populate: { path: 'customerId' }   // Deep populate Customer from CustomerOrder
            })
            .populate('updatedBy', 'email name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        WorkOrder.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };
};

/**
 * GET BY ID with deep population
 */
export const getById = async (id: string) => {
    const item = await WorkOrder.findById(id)
        .populate({
            path: 'customerOrderId',
            populate: { path: 'customerId' }   // Deep populate Customer from CustomerOrder
        })
        .populate('updatedBy', 'email name');
    if (!item) throw new AppError('Work order not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateWorkOrderInput) => {
    const item = await WorkOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Work order not found', 404);
    return item;
};

export const deleteWorkOrder = async (id: string) => {
    const item = await WorkOrder.findByIdAndDelete(id);
    if (!item) throw new AppError('Work order not found', 404);
};

/**
 * Bulk delete multiple work orders by IDs.
 * Admin-only operation.
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await WorkOrder.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};
