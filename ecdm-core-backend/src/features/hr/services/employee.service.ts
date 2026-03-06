import User from '../../auth/auth.model';
import Attendance from '../models/attendance.model';
import WorkOrder from '../../operations/models/work-order.model';
import { AppError } from '../../../utils/apiError';
import { Types } from 'mongoose';

/**
 * Employee Service - HR Module
 * 
 * Handles employee profile operations and 360 view aggregation.
 */

/**
 * GET ALL Employees (Users) with HR-relevant filtering
 */
export const getAll = async (query: Record<string, unknown>) => {
    const { 
        page = 1, 
        limit = 20, 
        search, 
        department, 
        role, 
        isActive 
    } = query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const filter: Record<string, unknown> = {};

    if (department) filter.department = { $regex: department, $options: 'i' };
    if (role)       filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;

    if (search) {
        filter.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { employeeId: { $regex: search, $options: 'i' } },
        ];
    }

    const [data, total] = await Promise.all([
        User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        User.countDocuments(filter),
    ]);

    return {
        data,
        pagination: { 
            page: Number(page), 
            limit: Number(limit), 
            total, 
            pages: Math.ceil(total / Number(limit)) 
        },
    };
};

/**
 * GET Employee by ID with basic profile
 */
export const getById = async (id: string) => {
    const employee = await User.findById(id).select('-password');
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
};

/**
 * GET Employee 360 Profile
 * Aggregates: User profile, Attendance records, Assigned tasks/work orders
 */
export const get360Profile = async (id: string) => {
    const employee = await User.findById(id).select('-password');
    if (!employee) throw new AppError('Employee not found', 404);

    // Get attendance records for this employee
    const attendanceRecords = await Attendance.find({ 
        $or: [
            { userId: new Types.ObjectId(id) },
            { employeeId: employee.employeeId }
        ]
    })
    .sort({ date: -1 })
    .limit(100);

    // Calculate attendance statistics
    const attendanceStats = await getAttendanceStats(id, employee.employeeId);

    // Get work orders assigned to this employee
    const workOrders = await WorkOrder.find({
        $or: [
            { maintenanceEngineer: { $regex: `${employee.firstName}|${employee.lastName}`, $options: 'i' } },
            { updatedBy: new Types.ObjectId(id) }
        ]
    })
    .populate({
        path: 'customerOrderId',
        populate: { path: 'customerId' }
    })
    .sort({ createdAt: -1 })
    .limit(50);

    // Calculate performance metrics
    const performanceStats = calculatePerformanceStats(workOrders);

    return {
        employee,
        attendance: {
            records: attendanceRecords,
            stats: attendanceStats,
        },
        workOrders: {
            records: workOrders,
            stats: performanceStats,
        },
    };
};

/**
 * Get attendance statistics for an employee
 */
const getAttendanceStats = async (userId: string, employeeId?: string) => {
    const filter: Record<string, unknown> = {};
    
    if (employeeId) {
        filter.$or = [
            { userId: new Types.ObjectId(userId) },
            { employeeId }
        ];
    } else {
        filter.userId = new Types.ObjectId(userId);
    }

    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get current year boundaries
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    // Monthly stats
    const monthlyFilter = { ...filter, date: { $gte: startOfMonth, $lte: endOfMonth } };
    const monthlyStats = await Attendance.aggregate([
        { $match: monthlyFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Yearly stats
    const yearlyFilter = { ...filter, date: { $gte: startOfYear, $lte: endOfYear } };
    const yearlyStats = await Attendance.aggregate([
        { $match: yearlyFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const monthlyBreakdown: Record<string, number> = monthlyStats.reduce((acc, curr) => {
        acc[curr._id || 'Unknown'] = curr.count;
        return acc;
    }, {} as Record<string, number>);

    const yearlyBreakdown: Record<string, number> = yearlyStats.reduce((acc, curr) => {
        acc[curr._id || 'Unknown'] = curr.count;
        return acc;
    }, {} as Record<string, number>);

    // Calculate totals
    const monthlyValues = Object.values(monthlyBreakdown) as number[];
    const yearlyValues = Object.values(yearlyBreakdown) as number[];
    const totalMonthly = monthlyValues.reduce((a, b) => a + b, 0);
    const totalYearly = yearlyValues.reduce((a, b) => a + b, 0);

    return {
        monthly: {
            total: totalMonthly,
            breakdown: monthlyBreakdown,
            presentRate: totalMonthly > 0 
                ? Math.round(((monthlyBreakdown['Present'] || 0) / totalMonthly) * 100) 
                : 0,
        },
        yearly: {
            total: totalYearly,
            breakdown: yearlyBreakdown,
            presentRate: totalYearly > 0 
                ? Math.round(((yearlyBreakdown['Present'] || 0) / totalYearly) * 100) 
                : 0,
        },
    };
};

/**
 * Calculate performance statistics from work orders
 */
const calculatePerformanceStats = (workOrders: any[]) => {
    const total = workOrders.length;
    if (total === 0) return { total: 0, completed: 0, completionRate: 0, onTime: 0, punctualityRate: 0 };

    const completed = workOrders.filter(wo => wo.taskCompleted === 'Yes').length;
    const onTime = workOrders.filter(wo => wo.punctuality === 'On Time').length;

    return {
        total,
        completed,
        completionRate: Math.round((completed / total) * 100),
        onTime,
        punctualityRate: Math.round((onTime / total) * 100),
    };
};

/**
 * Update employee profile (HR fields)
 */
export const updateProfile = async (id: string, data: {
    avatarUrl?: string;
    address?: string;
    employeeId?: string;
    phone?: string;
    department?: string;
}) => {
    const employee = await User.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
    ).select('-password');
    
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
};

/**
 * Add document to employee profile
 */
export const addDocument = async (id: string, document: { title: string; fileUrl: string }) => {
    const employee = await User.findByIdAndUpdate(
        id,
        { $push: { documents: { ...document, uploadedAt: new Date() } } },
        { new: true, runValidators: true }
    ).select('-password');
    
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
};

/**
 * Remove document from employee profile
 */
export const removeDocument = async (userId: string, documentId: string) => {
    const employee = await User.findByIdAndUpdate(
        userId,
        { $pull: { documents: { _id: new Types.ObjectId(documentId) } } },
        { new: true }
    ).select('-password');
    
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
};

/**
 * Link attendance records to user by employeeId
 */
export const linkAttendanceRecords = async (userId: string, employeeId: string) => {
    // Update user's employeeId
    await User.findByIdAndUpdate(userId, { employeeId });
    
    // Link existing attendance records
    const result = await Attendance.updateMany(
        { employeeId, userId: { $exists: false } },
        { $set: { userId: new Types.ObjectId(userId) } }
    );
    
    return { linkedRecords: result.modifiedCount };
};
