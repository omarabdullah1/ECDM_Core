import User from '../../auth/auth.model';
import Attendance from '../models/attendance.model';
import WorkOrder from '../../operations/models/work-order.model';
import SalesOrder from '../../sales/models/sales-order.model';
import SalesLead from '../../sales/models/sales-lead.model';
import SalesTarget from '../../sales/models/sales-target.model';
import { AppError } from '../../../utils/apiError';
import { Types } from 'mongoose';
import { Salary } from '../../finance/models/salary.model';
import RndTask from '../../rnd/models/rnd-task.model';
import FollowUp from '../../customer/models/follow-up.model';
import MarketingLead from '../../marketing/models/marketing-lead.model';

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
    const workOrderStats = calculatePerformanceStats(workOrders);

    // Calculate Sales KPIs if employee is in Sales/Manager/Admin role
    let salesKPIs = null;
    if (employee.role === 'Sales' || employee.role === 'Manager' || employee.role === 'Admin' || employee.role === 'SuperAdmin') {
        const salesPersonName = `${employee.firstName} ${employee.lastName}`;
        salesKPIs = await getSalesKPIs(realId, salesPersonName);
    }

    // Calculate Marketing KPIs if employee is in Marketing/Manager/Admin role
    let marketingKPIs = null;
    if (employee.role === 'Marketing' || employee.role === 'Manager' || employee.role === 'Admin' || employee.role === 'SuperAdmin') {
        marketingKPIs = await getMarketingKPIs(realId);
    }

    // 4. Standardized Performance Stats
    const performanceStats = await calculateStandardizedPerformance(
        realId, 
        employee.role, 
        attendanceStats, 
        workOrderStats, 
        salesKPIs,
        marketingKPIs
    );

    return {
        employee,
        attendance: {
            records: attendanceRecords,
            stats: attendanceStats,
        },
        workOrders: {
            records: workOrders,
            stats: workOrderStats,
        },
        salesKPIs,
        marketingKPIs,
        performanceStats,
        salaries: await Salary.find({ employeeId: new Types.ObjectId(realId) }).sort({ year: -1, month: -1 }).limit(12),
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

    // Monthly context for KPIs
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Tasks Completed (Monthly): ANY follow-up status is 'Accepted' (Won) OR 'Not Potential'
    const tasksCompleted = await SalesOrder.countDocuments({
        salesPerson: new Types.ObjectId(salespersonId),
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        $or: [
            { quotationStatusFirstFollowUp: { $in: ['Accepted', 'Not Potential', 'Scheduled'] } },
            { statusSecondFollowUp: { $in: ['Accepted', 'Not Potential', 'Scheduled'] } },
            { finalStatusThirdFollowUp: { $in: ['Accepted', 'Not Potential', 'Scheduled'] } },
        ],
    });

    // Open Orders (Monthly): NONE of the three follow-up stages is 'Accepted' (Won)
    const openOrders = await SalesOrder.countDocuments({
        salesPerson: new Types.ObjectId(salespersonId),
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
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

    // Achieved Amount (Monthly): Sum of quotation.grandTotal for won orders
    const wonOrders = await SalesOrder.find({
        salesPerson: new Types.ObjectId(salespersonId),
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        $or: [
            { quotationStatusFirstFollowUp: 'Accepted' },
            { statusSecondFollowUp: 'Accepted' },
            { finalStatusThirdFollowUp: 'Accepted' },
        ],
    });

    const achievedAmount = wonOrders.reduce((sum, order) => {
        const amount = order.quotation?.grandTotal || 0;
        return sum + amount;
    }, 0);

    // Get Target for this month from SalesTarget collection, fallback to User.targetSales
    const targetDoc = await SalesTarget.findOne({
        salespersonId: new Types.ObjectId(salespersonId),
        month: currentMonth,
        year: currentYear
    });

    const targetSales = targetDoc ? targetDoc.targetAmount : (employee?.targetSales || 0);

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
        targetSales,
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
 * Get Marketing KPIs for a marketing person
 */
const getMarketingKPIs = async (marketingPersonId: string) => {
    const employee = await User.findById(marketingPersonId).select('targetBudget');

    const totalLeads = await MarketingLead.countDocuments({
        assignedTo: new Types.ObjectId(marketingPersonId)
    });

    const convertedLeads = await MarketingLead.find({
        assignedTo: new Types.ObjectId(marketingPersonId),
        status: 'Converted'
    });

    const achievedAmount = convertedLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);

    return {
        totalLeads,
        convertedLeadsCount: convertedLeads.length,
        targetBudget: employee?.targetBudget || 0,
        achievedAmount,
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
 * Standardized Performance Calculation based on Role
 */
const calculateStandardizedPerformance = async (
    userId: string, 
    role: string, 
    attendanceStats?: any, 
    workOrderStats?: any, 
    salesKPIs?: any,
    marketingKPIs?: any
) => {
    let totalTasks = 0;
    let completed = 0;
    let punctualityRate = attendanceStats?.monthly?.presentRate || 0;

    const userObjectId = new Types.ObjectId(userId);

    switch (role) {
        case 'Sales':
            // Use pre-calculated sales KPIs if available
            if (salesKPIs) {
                // totalTasks = tasksCompleted (finalized) + openOrders (pending) + activeLeads (pending)
                totalTasks = (salesKPIs.tasksCompleted || 0) + (salesKPIs.openOrders || 0) + (salesKPIs.activeLeads || 0);
                completed = salesKPIs.tasksCompleted || 0;
            } else {
                const userDetails = await User.findById(userId).select('firstName lastName fullName email');
                const userFullName = userDetails?.fullName || '';
                const userEmail = userDetails?.email || '';

                const orderOrConditions: any[] = [{ salesPersonId: userId }];
                if (userFullName) orderOrConditions.push({ salesPersonName: { $regex: new RegExp(userFullName, 'i') } });
                if (userEmail) orderOrConditions.push({ salesPersonEmail: userEmail });

                const salesOrders = await SalesOrder.find({ $or: orderOrConditions });
                
                const leadOrConditions: any[] = [{ assignedTo: userId }];
                if (userFullName) leadOrConditions.push({ assignedToName: { $regex: new RegExp(userFullName, 'i') } });
                
                const salesLeads = await SalesLead.find({ $or: leadOrConditions });

                totalTasks = salesOrders.length + salesLeads.length;
                completed = salesOrders.filter((so: any) => 
                    so.quotationStatusFirstFollowUp === 'Accepted' || so.quotationStatusFirstFollowUp === 'Not Potential' ||
                    so.statusSecondFollowUp === 'Accepted' || so.statusSecondFollowUp === 'Not Potential' ||
                    so.finalStatusThirdFollowUp === 'Accepted' || so.finalStatusThirdFollowUp === 'Not Potential'
                ).length + salesLeads.filter((sl: any) => sl.status === 'Converted' || sl.status === 'Won').length;
            }
            break;

        case 'Operations':
        case 'Maintenance':
        case 'MaintenanceEngineer':
        case 'Technician':
            // Use pre-calculated work order stats if available
            if (workOrderStats) {
                totalTasks = workOrderStats.total || 0;
                completed = workOrderStats.completed || 0;
                punctualityRate = workOrderStats.punctualityRate || punctualityRate;
            } else {
                const workOrders = await WorkOrder.find({ updatedBy: userObjectId });
                totalTasks = workOrders.length;
                completed = workOrders.filter(wo => wo.taskCompleted === 'Yes').length;
                const onTimeCount = workOrders.filter((wo: any) => wo.punctuality === 'Same time' || wo.punctuality === 'On Time').length;
                punctualityRate = totalTasks > 0 ? Math.round((onTimeCount / totalTasks) * 100) : punctualityRate;
            }
            break;

        case 'CustomerService':
            const followUps = await FollowUp.find({ csr: userObjectId });
            totalTasks = followUps.length;
            completed = followUps.filter(f => f.status === 'Completed').length;
            const csOnTimeCount = followUps.filter(f => f.punctuality === 'Same Visit Time').length;
            punctualityRate = totalTasks > 0 ? Math.round((csOnTimeCount / totalTasks) * 100) : punctualityRate;
            break;

        case 'R&D':
            const rndTasks = await RndTask.find({ assigneeId: userObjectId });
            totalTasks = rndTasks.length;
            completed = rndTasks.filter(t => t.status === 'Done').length;
            break;

        case 'Marketing':
            if (marketingKPIs) {
                totalTasks = marketingKPIs.totalLeads || 0;
                completed = marketingKPIs.convertedLeadsCount || 0;
            } else {
                const leads = await MarketingLead.find({ assignedTo: userObjectId });
                totalTasks = leads.length;
                completed = leads.filter(l => l.status === 'Converted').length;
            }
            break;

        default:
            break;
    }

    return {
        totalTasks,
        completed,
        punctualityRate,
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

