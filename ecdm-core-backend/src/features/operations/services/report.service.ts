import ReportOperation from '../models/report-operation.model';
import User from '../../auth/auth.model';
import WorkOrder from '../models/work-order.model';
import { Punctuality, TaskCompleted } from '../types/work-order.types';
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

/**
 * Automatically calculate performance reports for all Operations/Maintenance staff
 * for the current month based on Work Orders data.
 */
export const getAutomatedReports = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Get all relevant personnel
    const roles = ['Operations', 'Maintenance', 'MaintenanceEngineer', 'Technician'];
    const users = await User.find({ role: { $in: roles }, isActive: true }).select('firstName lastName role');

    const reports = await Promise.all(users.map(async (user) => {
        // 2. Fetch Work Orders for this user in this period
        // Match by updatedBy OR maintenanceEngineer (case-insensitive regex on name)
        const workOrders = await WorkOrder.find({
            $or: [
                { updatedBy: user._id },
                { maintenanceEngineer: { $regex: new RegExp(user.firstName, 'i') } }
            ],
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const total = workOrders.length;
        if (total === 0) {
            return {
                _id: user._id.toString(),
                employee: { _id: user._id, firstName: user.firstName, lastName: user.lastName, role: user.role },
                evaluationPeriod: { startDate: startOfMonth, endDate: endOfMonth },
                punctualityScore: 0,
                completionRate: 0,
                taskQualityScore: 0,
                overallPerformanceScore: 0,
                notes: 'No work orders found for this period',
                isAutomated: true
            };
        }

        const completed = workOrders.filter(wo => wo.taskCompleted === TaskCompleted.Yes).length;
        const onTime = workOrders.filter(wo => wo.punctuality === Punctuality.SameTime).length;
        
        // Quality: Average of numeric ratings (if any)
        const ratings = workOrders.map(wo => parseFloat(wo.rating)).filter(r => !isNaN(r));
        const avgQuality = ratings.length > 0 
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
            : 4.0; // Default to 4.0 if no ratings

        const completionRate = Math.round((completed / total) * 100);
        const punctualityScore = Math.round((onTime / total) * 100);
        const qualityNormalised = (avgQuality / 5) * 100;

        const overall = Math.round(
            punctualityScore * 0.30 +
            completionRate   * 0.30 +
            qualityNormalised * 0.40
        );

        return {
            _id: user._id.toString(),
            employee: { _id: user._id, firstName: user.firstName, lastName: user.lastName, role: user.role },
            evaluationPeriod: { startDate: startOfMonth, endDate: endOfMonth },
            punctualityScore,
            completionRate,
            taskQualityScore: avgQuality,
            overallPerformanceScore: overall,
            notes: `Auto-calculated from ${total} work orders`,
            isAutomated: true
        };
    }));

    return reports;
};

