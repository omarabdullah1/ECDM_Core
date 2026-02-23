import EmployeeEvaluation from './employee-evaluation.model';
import { AppError } from '../../../utils/apiError';
import { CreateEmployeeEvaluationInput, UpdateEmployeeEvaluationInput } from './employee-evaluation.validation';

export const create = async (data: CreateEmployeeEvaluationInput) => EmployeeEvaluation.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, employee } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (employee) filter.employee = employee;

    const [data, total] = await Promise.all([
        EmployeeEvaluation.find(filter)
            .populate('employee', 'firstName lastName email role')
            .sort({ 'evaluationPeriod.startDate': -1 })
            .skip(skip)
            .limit(Number(limit)),
        EmployeeEvaluation.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };
};

export const getById = async (id: string) => {
    const item = await EmployeeEvaluation.findById(id)
        .populate('employee', 'firstName lastName email role');
    if (!item) throw new AppError('Employee evaluation not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateEmployeeEvaluationInput) => {
    const item = await EmployeeEvaluation.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Employee evaluation not found', 404);
    return item;
};

export const deleteEvaluation = async (id: string) => {
    const item = await EmployeeEvaluation.findByIdAndDelete(id);
    if (!item) throw new AppError('Employee evaluation not found', 404);
};
