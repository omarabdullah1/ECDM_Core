import ReportOperation from '../models/report-operation.model';
import { AppError } from '../../../utils/apiError';
import { CreateReportInput, UpdateReportInput } from '../validation/report.validation';

export const create = async (data: CreateReportInput) => ReportOperation.create(data);

export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, employee } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: Record<string, unknown> = {};
    if (employee) filter.employee = employee;

    const [data, total] = await Promise.all([
        ReportOperation.find(filter)
            .populate('employee', 'firstName lastName email role')
            .sort({ 'evaluationPeriod.startDate': -1 })
            .skip(skip)
            .limit(Number(limit)),
        ReportOperation.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };
};

export const getById = async (id: string) => {
    const item = await ReportOperation.findById(id)
        .populate('employee', 'firstName lastName email role');
    if (!item) throw new AppError('Report not found', 404);
    return item;
};

export const update = async (id: string, data: UpdateReportInput) => {
    const item = await ReportOperation.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Report not found', 404);
    return item;
};

export const deleteReport = async (id: string) => {
    const item = await ReportOperation.findByIdAndDelete(id);
    if (!item) throw new AppError('Report not found', 404);
};
