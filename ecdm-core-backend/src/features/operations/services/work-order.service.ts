import WorkOrder from '../models/work-order.model';
import { AppError } from '../../../utils/apiError';
import { CreateWorkOrderInput, UpdateWorkOrderInput } from '../validation/work-order.validation';

export const create = async (data: CreateWorkOrderInput) => WorkOrder.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, assignedEngineer, customerOrder, punctuality, typeOfOrder } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (customer)         filter.customer         = customer;
    if (assignedEngineer) filter.assignedEngineer = assignedEngineer;
    if (customerOrder)    filter.customerOrder    = customerOrder;
    if (punctuality)      filter.punctuality      = punctuality;
    if (typeOfOrder)      filter.typeOfOrder      = typeOfOrder;

    const [data, total] = await Promise.all([
        WorkOrder.find(filter)
            .populate('customer', 'name phone')
            .populate('assignedEngineer', 'firstName lastName')
            .populate('salesOrder', 'quotationStatus')
            .populate('customerOrder')
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

export const getById = async (id: string) => {
    const item = await WorkOrder.findById(id)
        .populate('customer', 'name phone')
        .populate('assignedEngineer', 'firstName lastName')
        .populate('salesOrder')
        .populate('customerOrder')
        .populate('sparePartsUsed.inventoryItem', 'itemName stockNumber');
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
