import Attendance from '../models/attendance.model';
import { AppError } from '../../../utils/apiError';
import { CreateAttendanceInput, UpdateAttendanceInput } from '../validation/attendance.validation';
import { Types } from 'mongoose';

/**
 * Attendance Service - HR Module
 * 
 * Handles CRUD operations for Attendance records.
 * Supports bulk upload from Excel/CSV files.
 */

export const create = async (data: CreateAttendanceInput) => {
    return Attendance.create(data);
};

/**
 * Bulk create attendance records from Excel upload
 */
export const bulkCreate = async (records: CreateAttendanceInput[], uploadedBy?: string) => {
    // Try to link employee IDs to existing users
    const recordsWithLinks = await Promise.all(
        records.map(async (record) => {
            // Try to find user by matching criteria (employeeId could be stored in phone or custom field)
            let userId: Types.ObjectId | undefined;
            
            // You could implement more sophisticated matching here
            // For now, we'll skip auto-linking and let admins do it manually
            
            return {
                ...record,
                date: new Date(record.date),
                userId,
                uploadedBy: uploadedBy ? new Types.ObjectId(uploadedBy) : undefined,
            };
        })
    );

    // Use insertMany with ordered: false to continue on duplicates
    const result = await Attendance.insertMany(recordsWithLinks, { ordered: false })
        .catch((error) => {
            // Handle duplicate key errors gracefully
            if (error.writeErrors) {
                return { insertedCount: error.insertedDocs?.length || 0, errors: error.writeErrors };
            }
            throw error;
        });

    return result;
};

/**
 * GET ALL Attendance records with filtering and pagination
 */
export const getAll = async (query: Record<string, unknown>) => {
    const { 
        page = 1, 
        limit = 50, 
        employeeId, 
        userId, 
        department, 
        status, 
        date,
        startDate, 
        endDate,
        search 
    } = query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const filter: Record<string, unknown> = {};

    if (employeeId)  filter.employeeId = { $regex: employeeId, $options: 'i' };
    if (userId)      filter.userId = userId;
    if (department)  filter.department = { $regex: department, $options: 'i' };
    if (status)      filter.status = status;
    
    // Support filtering by specific date (YYYY-MM-DD)
    if (date) {
        const targetDate = new Date(date as string);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        filter.date = {
            $gte: targetDate,
            $lt: nextDay
        };
    } else if (startDate || endDate) {
        filter.date = {};
        if (startDate) (filter.date as Record<string, Date>).$gte = new Date(startDate as string);
        if (endDate)   (filter.date as Record<string, Date>).$lte = new Date(endDate as string);
    }

    if (search) {
        filter.$or = [
            { employeeId: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { department: { $regex: search, $options: 'i' } },
        ];
    }

    const [data, total] = await Promise.all([
        Attendance.find(filter)
            .populate('userId', 'firstName lastName email')
            .populate('uploadedBy', 'firstName lastName email')
            .sort({ date: -1, employeeId: 1 })
            .skip(skip)
            .limit(Number(limit)),
        Attendance.countDocuments(filter),
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
 * GET BY ID
 */
export const getById = async (id: string) => {
    const item = await Attendance.findById(id)
        .populate('userId', 'firstName lastName email')
        .populate('uploadedBy', 'firstName lastName email');
    if (!item) throw new AppError('Attendance record not found', 404);
    return item;
};

/**
 * GET attendance records for a specific employee
 */
export const getByEmployeeId = async (employeeId: string, query: Record<string, unknown>) => {
    const { page = 1, limit = 50, startDate, endDate } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const filter: Record<string, unknown> = { employeeId };
    
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) (filter.date as Record<string, Date>).$gte = new Date(startDate as string);
        if (endDate)   (filter.date as Record<string, Date>).$lte = new Date(endDate as string);
    }

    const [data, total] = await Promise.all([
        Attendance.find(filter)
            .populate('userId', 'firstName lastName email')
            .sort({ date: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Attendance.countDocuments(filter),
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
 * GET attendance records for a specific user (by userId)
 */
export const getByUserId = async (userId: string, query: Record<string, unknown>) => {
    const { page = 1, limit = 50, startDate, endDate } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) (filter.date as Record<string, Date>).$gte = new Date(startDate as string);
        if (endDate)   (filter.date as Record<string, Date>).$lte = new Date(endDate as string);
    }

    const [data, total] = await Promise.all([
        Attendance.find(filter)
            .sort({ date: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Attendance.countDocuments(filter),
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

export const update = async (id: string, data: UpdateAttendanceInput) => {
    const item = await Attendance.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw new AppError('Attendance record not found', 404);
    return item;
};

export const deleteAttendance = async (id: string) => {
    const item = await Attendance.findByIdAndDelete(id);
    if (!item) throw new AppError('Attendance record not found', 404);
};

/**
 * Bulk delete attendance records
 */
export const bulkDelete = async (ids: string[]): Promise<{ deletedCount: number }> => {
    const result = await Attendance.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
};

/**
 * Get attendance statistics for an employee
 */
export const getEmployeeStats = async (userId: string, year?: number, month?: number) => {
    const matchStage: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    
    if (year) {
        const startDate = new Date(year, month ? month - 1 : 0, 1);
        const endDate = month 
            ? new Date(year, month, 0, 23, 59, 59)
            : new Date(year, 11, 31, 23, 59, 59);
        matchStage.date = { $gte: startDate, $lte: endDate };
    }

    const stats = await Attendance.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);

    const totalDays = await Attendance.countDocuments(matchStage);
    
    return {
        totalDays,
        breakdown: stats.reduce((acc, curr) => {
            acc[curr._id || 'Unknown'] = curr.count;
            return acc;
        }, {} as Record<string, number>),
    };
};

/**
 * GET Attendance Folders (Date-grouped aggregation)
 * Used for the folder-based UI view
 * @param startDate - Optional filter for minimum date (YYYY-MM-DD)
 * @param endDate - Optional filter for maximum date (YYYY-MM-DD)
 */
export const getAttendanceFolders = async (startDate?: string, endDate?: string) => {
    const pipeline: any[] = [];
    
    // Build the match stage dynamically for date range filtering
    const matchStage: Record<string, any> = {};
    if (startDate || endDate) {
        matchStage.date = {};
        if (startDate) {
            const start = new Date(startDate);
            start.setUTCHours(0, 0, 0, 0);
            matchStage.date.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);
            matchStage.date.$lte = end;
        }
    }
    
    // Only add $match stage if there are date filters
    if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
    }
    
    // Group by date and calculate statistics
    pipeline.push({
        $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            totalRecords: { $sum: 1 },
            presentCount: { 
                $sum: { 
                    $cond: [
                        { $in: ["$status", ["Present", "Half-day"]] }, 
                        1, 
                        0 
                    ] 
                } 
            },
            absentCount: { 
                $sum: { 
                    $cond: [
                        { $in: ["$status", ["Absent", "Leave", "SickLeave", "AnnualLeave"]] }, 
                        1, 
                        0 
                    ] 
                } 
            },
            lateCount: { 
                $sum: { 
                    $cond: [
                        { $eq: ["$status", "Late"] }, 
                        1, 
                        0 
                    ] 
                } 
            }
        }
    });
    
    // Sort newest folders first
    pipeline.push({ $sort: { _id: -1 } });
    
    const folders = await Attendance.aggregate(pipeline);
    return folders;
};
