import WorkOrder from './work-order.model';
import { AppError } from '../../../utils/apiError';
import { CreateWorkOrderInput, UpdateWorkOrderInput } from './work-order.validation';

export const create = async (data: CreateWorkOrderInput) => WorkOrder.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, customer, assignedEngineer, typeOfOrder, punctuality } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (customer)         filter.customer         = customer;
    if (assignedEngineer) filter.assignedEngineer = assignedEngineer;
    if (typeOfOrder)      filter.typeOfOrder      = typeOfOrder;
    if (punctuality)      filter.punctuality      = punctuality;

    const [data, total] = await Promise.all([
        WorkOrder.find(filter)
            .populate('customer', 'name phone region sector')
            .populate('assignedEngineer', 'firstName lastName email')
            .populate('salesOrder', 'quotationNumber finalStatus')
            .populate('sparePartsUsed.inventoryItem', 'itemName stockNumber')
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
        .populate('customer', 'name phone region sector')
        .populate('assignedEngineer', 'firstName lastName email')
        .populate('salesOrder')
        .populate('sparePartsUsed.inventoryItem', 'itemName stockNumber price');
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
