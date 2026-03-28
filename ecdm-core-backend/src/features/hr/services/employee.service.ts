import User from '../../auth/auth.model';
import Attendance from '../models/attendance.model';
import WorkOrder from '../../operations/models/work-order.model';
import SalesOrder from '../../sales/models/sales-order.model';
import SalesLead from '../../sales/models/sales-lead.model';
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
    // 1. Smart Lookup: Handle both MongoDB _id and custom employeeId (e.g. EMP-1042)
    const isObjectId = Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { employeeId: id };
    
    const employee = await User.findOne(query).select('-password');
    if (!employee) throw new AppError('Employee not found', 404);

    // Get the real ObjectId as string for references
    const realId = employee._id.toString();

    // Build attendance query dynamically to avoid passing undefined
    const attendanceOrConditions: any[] = [{ userId: new Types.ObjectId(realId) }];
    if (employee.employeeId && Types.ObjectId.isValid(employee.employeeId)) {
        attendanceOrConditions.push({ employeeId: new Types.ObjectId(employee.employeeId) });
    }

    // Get attendance records for this employee
    const attendanceRecords = await Attendance.find({ 
        $or: attendanceOrConditions
    })
    .sort({ date: -1 })
    .limit(100);

    // Calculate attendance statistics
    const attendanceStats = await getAttendanceStats(realId, employee.employeeId);

    // 2. Safe Work Orders Query
    const woOrConditions: any[] = [{ updatedBy: new Types.ObjectId(realId) }];
    
    // Extract all possible name parts (fallback to fullName or name)
    const nameParts: string[] = [];
    if (employee.firstName) nameParts.push(employee.firstName.trim());
    if (employee.lastName) nameParts.push(employee.lastName.trim());
    if (employee.fullName) {
        nameParts.push(...employee.fullName.split(' ').map((s: string) => s.trim()));
    }
    if ((employee as any).name) { // Fallback just in case the schema uses 'name'
        nameParts.push(...(employee as any).name.split(' ').map((s: string) => s.trim()));
    }
    
    // Clean up: remove duplicates, empty strings, and extremely short strings (<= 2 chars)
    const validTerms = [...new Set(nameParts)].filter(term => term && term.length > 2);
    
    if (validTerms.length > 0) {
        // Escape native regex special characters to prevent MongoDB 500 MongoServerError on invalid regex
        const escapeRegex = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexString = validTerms.map(escapeRegex).join('|');
        
        // Use native MongoDB $regex syntax for absolute compatibility
        woOrConditions.push({ 
            maintenanceEngineer: { $regex: regexString, $options: 'i' }
        });
    }

    const workOrders = await WorkOrder.find({ $or: woOrConditions })
        .populate({
            path: 'customerOrderId',
            populate: { path: 'customerId' }
        })
        .sort({ createdAt: -1 })
        .limit(50);

    // Calculate performance metrics
    const performanceStats = calculatePerformanceStats(workOrders);

    // Calculate Sales KPIs if employee is in Sales role
    let salesKPIs = null;
    if (employee.role === 'Sales') {
        const salesPersonName = `${employee.firstName} ${employee.lastName}`;
        salesKPIs = await getSalesKPIs(realId, salesPersonName);
    }

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
        salesKPIs,
    };
};

/**
 * Get Sales KPIs for a salesperson
 * 
 * Business Logic:
 * - Tasks Completed: Sales Orders with Accepted OR Not Potential in ANY of the three follow-up stages
 * - Open Orders: Sales Orders where NONE of the three follow-up stages is 'Accepted' 
 * - Active Leads: Sales Leads assigned to this user that are NOT Closed
 * - Attendance Rate: Monthly present rate from attendance records
 * - Target Sales: From User model's targetSales field
 * - Achieved Amount: Sum of quotation.grandTotal for orders where ANY follow-up stage = 'Accepted'
 */
const getSalesKPIs = async (salespersonId: string, salesPersonName?: string) => {
    const employee = await User.findById(salespersonId).select('targetSales firstName lastName email');

    // Tasks Completed: ANY follow-up status is 'Accepted' (Won) OR 'Not Potential' in any stage
    const tasksCompleted = await SalesOrder.countDocuments({
        salesPerson: new Types.ObjectId(salespersonId),
        $or: [
            { quotationStatusFirstFollowUp: { $in: ['Accepted', 'Not Potential'] } },
            { statusSecondFollowUp: { $in: ['Accepted', 'Not Potential'] } },
            { finalStatusThirdFollowUp: { $in: ['Accepted', 'Not Potential'] } },
        ],
    });

    // Open Orders: NONE of the three follow-up stages is 'Accepted' (Won)
    const openOrders = await SalesOrder.countDocuments({
        salesPerson: new Types.ObjectId(salespersonId),
        quotationStatusFirstFollowUp: { $nin: ['Accepted'] },
        statusSecondFollowUp: { $nin: ['Accepted'] },
        finalStatusThirdFollowUp: { $nin: ['Accepted'] },
    });

    // Active Leads: Sales Leads assigned to this user that are NOT Closed
    const leadFilter: Record<string, unknown> = {
        status: { $ne: 'Closed' }
    };
    if (salesPersonName) {
        leadFilter.salesPerson = salesPersonName;
    }
    const activeLeads = await SalesLead.countDocuments(leadFilter);

    console.log(`[SalesKPIs] User ${salespersonId}: Tasks Completed = ${tasksCompleted}, Open Orders = ${openOrders}, Active Leads = ${activeLeads}`);

    // Achieved Amount: Sum of quotation.grandTotal for won orders (ANY follow-up stage = 'Accepted')
    const wonOrders = await SalesOrder.find({
        salesPerson: new Types.ObjectId(salespersonId),
        $or: [
            { quotationStatusFirstFollowUp: 'Accepted' },
            { statusSecondFollowUp: 'Accepted' },
            { finalStatusThirdFollowUp: 'Accepted' },
        ],
    });

    const achievedAmount = wonOrders.reduce((sum, order) => {
        const amount = order.quotation?.grandTotal || 0;
        console.log(`[SalesKPIs] Won Order ${order.salesOrderId}: grandTotal = ${amount}`);
        return sum + amount;
    }, 0);

    console.log(`[SalesKPIs] User ${salespersonId}: Achieved Amount = ${achievedAmount}`);

    // Get attendance rate for this month
    const attendanceStats = await getAttendanceStats(salespersonId, employee?.employeeId);

    // Get Sales Orders for the table display - include salesData for typeOfOrder fallback
    const salesOrders = await SalesOrder.find({ salesPerson: new Types.ObjectId(salespersonId) })
        .populate('customer', 'name')
        .populate('salesData', 'typeOfOrder')
        .sort({ createdAt: -1 })
        .limit(50);

    return {
        tasksCompleted,
        openOrders,
        activeLeads,
        targetSales: employee?.targetSales || 0,
        achievedAmount,
        attendanceRate: attendanceStats.monthly.presentRate,
        salesOrders: salesOrders.map(order => ({
            _id: order._id,
            salesOrderId: order.salesOrderId,
            customer: order.customer,
            typeOfOrder: order.typeOfOrder,
            salesDataTypeOfOrder: (order as any).salesData?.typeOfOrder,
            quotationStatusFirstFollowUp: order.quotationStatusFirstFollowUp,
            statusSecondFollowUp: order.statusSecondFollowUp,
            finalStatusThirdFollowUp: order.finalStatusThirdFollowUp,
            quotation: order.quotation,
            createdAt: order.createdAt,
        })),
    };
};

/**
 * Get attendance statistics for an employee
 */
const getAttendanceStats = async (userId: string, employeeId?: string) => {
    const filter: Record<string, unknown> = {};
    
    if (employeeId && Types.ObjectId.isValid(employeeId)) {
        filter.$or = [
            { userId: new Types.ObjectId(userId) },
            { employeeId: new Types.ObjectId(employeeId) }
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
