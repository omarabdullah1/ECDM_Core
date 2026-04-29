import ReportOperation from '../models/report-operation.model';
import WorkOrder from '../models/work-order.model';
import Attendance from '../../hr/models/attendance.model';
import User from '../../auth/auth.model';
import Employee from '../../shared/models/employee.model';
import { AppError } from '../../../utils/apiError';
import { Types } from 'mongoose';
import { AttendanceStatus } from '../../hr/types/attendance.types';

interface EvaluationMetrics {
    punctualityScore: number;
    taskCompletedCount: number;
    taskReturnedCount: number;
    completionRate: number;
    returnRate: number;
    taskQualityScore: number;
    attendanceSummary: {
        totalDays: number;
        presentDays: number;
        absentDays: number;
        lateDays: number;
    };
    workOrderSummary: {
        totalWorkOrders: number;
        completedWorkOrders: number;
        ratings: number[];
    };
}

/**
 * Calculate evaluation metrics from Attendance and WorkOrder data
 */
export const calculateEvaluationMetrics = async (
    userId: string,
    startDate: Date,
    endDate: Date
): Promise<EvaluationMetrics> => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Find the Employee record linked to this User
    const employee = await Employee.findOne({ userId: new Types.ObjectId(userId) });
    if (!employee) {
        throw new AppError('Employee record not found for this user', 404);
    }

    // Get attendance data using employeeId (ObjectId reference to Employee)
    const attendanceRecords = await Attendance.find({
        employeeId: employee._id,
        date: { $gte: startDate, $lte: endDate },
    });

    // Calculate attendance metrics
    const attendanceSummary = {
        totalDays: attendanceRecords.length,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
    };

    attendanceRecords.forEach((record: any) => {
        switch (record.status) {
            case AttendanceStatus.Present:
            case AttendanceStatus.HalfDay:
            case AttendanceStatus.Leave:
                attendanceSummary.presentDays++;
                break;
            case AttendanceStatus.Late:
                attendanceSummary.lateDays++;
                attendanceSummary.presentDays++;
                break;
            case AttendanceStatus.Absent:
                attendanceSummary.absentDays++;
                break;
        }
    });

    // Calculate punctuality score (100 - (late days / total days * 100))
    const punctualityScore = attendanceSummary.totalDays > 0
        ? Math.round((1 - attendanceSummary.lateDays / attendanceSummary.totalDays) * 100)
        : 0;

    // Get work order data
    const workOrders = await WorkOrder.find({
        maintenanceEngineer: { $regex: `${user.firstName}|${user.lastName}`, $options: 'i' },
        createdAt: { $gte: startDate, $lte: endDate },
    });

    // Calculate work order metrics
    const taskCompletedCount = workOrders.filter(wo => wo.taskCompleted === 'Yes').length;
    const totalWorkOrders = workOrders.length;

    // Calculate completion rate
    const completionRate = totalWorkOrders > 0
        ? Math.round((taskCompletedCount / totalWorkOrders) * 100)
        : 0;

    // Calculate return/rework rate (based on 'No' for task completion - need to define this metric)
    const taskReturnedCount = 0; // Would need a 'returned' field in WorkOrder

    // Calculate return rate
    const returnRate = totalWorkOrders > 0
        ? Math.round((taskReturnedCount / totalWorkOrders) * 100)
        : 0;

    // Calculate quality score from ratings
    const ratings = workOrders
        .filter(wo => wo.rating && !isNaN(parseInt(wo.rating)))
        .map(wo => parseInt(wo.rating));

    const taskQualityScore = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    return {
        punctualityScore: Math.min(100, Math.max(0, punctualityScore)),
        taskCompletedCount,
        taskReturnedCount,
        completionRate: Math.min(100, Math.max(0, completionRate)),
        returnRate: Math.min(100, Math.max(0, returnRate)),
        taskQualityScore: Math.min(5, Math.max(0, Math.round(taskQualityScore * 10) / 10)),
        attendanceSummary,
        workOrderSummary: {
            totalWorkOrders,
            completedWorkOrders: taskCompletedCount,
            ratings,
        },
    };
};

/**
 * Auto-generate employee evaluation report
 */
export const autoGenerateEvaluation = async (
    userId: string,
    startDate: Date,
    endDate: Date,
    options?: {
        notes?: string;
        overrideExisting?: boolean;
    }
): Promise<any> => {
    // Check if report already exists
    const existingReport = await ReportOperation.findOne({
        employee: new Types.ObjectId(userId),
        'evaluationPeriod.startDate': {
            $gte: new Date(startDate.setHours(0, 0, 0, 0)),
            $lte: new Date(startDate.setHours(23, 59, 59, 999)),
        },
    });

    if (existingReport && !options?.overrideExisting) {
        throw new AppError('Evaluation report already exists for this period. Use overrideExisting to replace.', 400);
    }

    // Calculate metrics
    const metrics = await calculateEvaluationMetrics(userId, startDate, endDate);

    // Create or update report
    const reportData = {
        employee: new Types.ObjectId(userId),
        evaluationPeriod: {
            startDate,
            endDate,
        },
        punctualityScore: metrics.punctualityScore,
        taskCompletedCount: metrics.taskCompletedCount,
        taskReturnedCount: metrics.taskReturnedCount,
        completionRate: metrics.completionRate,
        returnRate: metrics.returnRate,
        taskQualityScore: metrics.taskQualityScore,
        // Note: overallPerformanceScore is auto-calculated by pre-save hook
        notes: options?.notes || `Auto-generated evaluation. Attendance: ${metrics.attendanceSummary.presentDays}/${metrics.attendanceSummary.totalDays} days present. Work Orders: ${metrics.workOrderSummary.completedWorkOrders}/${metrics.workOrderSummary.totalWorkOrders} completed.`,
    };

    let report;
    if (existingReport && options?.overrideExisting) {
        report = await ReportOperation.findByIdAndUpdate(
            existingReport._id,
            reportData,
            { new: true, runValidators: true }
        );
    } else {
        report = await ReportOperation.create(reportData);
    }

    return {
        report,
        metrics,
    };
};

/**
 * Generate evaluations for all employees in Operations department
 */
export const generateBulkEvaluations = async (
    startDate: Date,
    endDate: Date,
    options?: {
        department?: string;
        userIds?: string[];
    }
): Promise<{ generated: number; failed: number; errors: string[] }> => {
    // Get users to evaluate
    const filter: Record<string, unknown> = {
        isActive: true,
        role: { $in: ['Operations', 'Maintenance', 'Technician', 'MaintenanceEngineer'] },
    };

    if (options?.userIds?.length) {
        filter._id = { $in: options.userIds.map(id => new Types.ObjectId(id)) };
    }

    if (options?.department) {
        filter.department = options.department;
    }

    const users = await User.find(filter);
    
    const results = {
        generated: 0,
        failed: 0,
        errors: [] as string[],
    };

    for (const user of users) {
        try {
            await autoGenerateEvaluation(user._id.toString(), startDate, endDate);
            results.generated++;
        } catch (error: any) {
            results.failed++;
            results.errors.push(`${user.firstName} ${user.lastName}: ${error.message}`);
        }
    }

    return results;
};

/**
 * Get evaluation summary for an employee
 */
export const getEvaluationSummary = async (userId: string) => {
    const reports = await ReportOperation.find({
        employee: new Types.ObjectId(userId),
    })
        .sort({ 'evaluationPeriod.startDate': -1 })
        .limit(12); // Last 12 evaluations (e.g., 12 months)

    if (reports.length === 0) {
        return {
            totalEvaluations: 0,
            averageScore: 0,
            trend: 'neutral',
            recentReports: [],
        };
    }

    const scores = reports.map(r => r.overallPerformanceScore);
    const averageScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);

    // Calculate trend (compare last 3 vs previous 3)
    const recentScores = scores.slice(0, 3);
    const olderScores = scores.slice(3, 6);
    
    const recentAvg = recentScores.length > 0 
        ? recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length 
        : 0;
    const olderAvg = olderScores.length > 0 
        ? olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length 
        : 0;

    let trend: 'improving' | 'declining' | 'stable' | 'neutral' = 'neutral';
    if (recentAvg > olderAvg + 5) trend = 'improving';
    else if (recentAvg < olderAvg - 5) trend = 'declining';
    else if (recentAvg === olderAvg && recentAvg > 0) trend = 'stable';

    return {
        totalEvaluations: reports.length,
        averageScore,
        trend,
        recentReports: reports.slice(0, 6),
    };
};

