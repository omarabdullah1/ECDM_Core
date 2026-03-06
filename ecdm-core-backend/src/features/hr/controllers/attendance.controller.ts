import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/attendance.service';
import { sendSuccess } from '../../../utils/apiResponse';
import fs from 'fs';
import mongoose from 'mongoose';

// Conditional import for xlsx
let xlsx: any;
try {
    xlsx = require('xlsx');
} catch {
    console.warn('⚠️  xlsx not installed. Run: npm install xlsx');
}

/**
 * Attendance Controller - HR Module
 * 
 * Handles HTTP requests for attendance management including bulk Excel uploads.
 */

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { item: await svc.create(req.body) }, 'Attendance record created', 201);
    } catch (e) {
        next(e);
    }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getAll(req.query as Record<string, unknown>));
    } catch (e) {
        next(e);
    }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { item: await svc.getById(String(req.params.id)) });
    } catch (e) {
        next(e);
    }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { item: await svc.update(String(req.params.id), req.body) }, 'Attendance record updated');
    } catch (e) {
        next(e);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.deleteAttendance(String(req.params.id));
        sendSuccess(res, null, 'Attendance record deleted');
    } catch (e) {
        next(e);
    }
};

export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        
        const result = await svc.bulkDelete(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} attendance records`);
    } catch (e) {
        next(e);
    }
};

/**
 * GET /api/hr/attendance/folders
 * 
 * Returns attendance records grouped by date for the folder-based UI.
 * Each folder shows aggregated statistics per date.
 * Supports date range filtering via query parameters: startDate, endDate
 */
export const getAttendanceFolders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { startDate, endDate } = req.query;
        const folders = await svc.getAttendanceFolders(
            startDate as string | undefined,
            endDate as string | undefined
        );
        sendSuccess(res, { folders });
    } catch (e) {
        next(e);
    }
};

/**
 * POST /api/hr/attendance/upload
 * 
 * Bulk upload attendance records from Excel/CSV file.
 * Expects multipart/form-data with 'file' field.
 * 
 * Excel columns expected:
 * - EmployeeID (required)
 * - Name (required)
 * - Department
 * - Date (required)
 * - Day
 * - Check In / CheckIn
 * - Check Out / CheckOut
 * - Status
 * - Notes
 */
export const uploadExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!xlsx) {
            sendSuccess(res, null, 'xlsx package not installed. Run: npm install xlsx', 500);
            return;
        }

        if (!req.file) {
            sendSuccess(res, null, 'No file uploaded', 400);
            return;
        }

        const filePath = req.file.path;
        
        try {
            // Read the Excel/CSV file
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            
            // 1. Read raw data ensuring empty cells are handled properly
            const rawData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

            if (!rawData || rawData.length === 0) {
                sendSuccess(res, null, 'No data found in the uploaded file', 400);
                return;
            }

            // 2. Bulletproof loop to find the header row (Scan up to 50 rows)
            let headerRowIndex = -1;
            let mappedHeaders: string[] = [];

            for (let i = 0; i < Math.min(50, rawData.length); i++) {
                const row = rawData[i];
                if (!row || !Array.isArray(row) || row.length === 0) continue;
                
                // Clean every cell in the row: lowercase, remove ALL non-alphanumeric chars (kills emojis, spaces, symbols)
                const cleanCells = row.map(cell => String(cell || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
                
                // Check if this row contains our target columns
                const hasEmpId = cleanCells.some(c => c.includes('employeeid') || c === 'id');
                const hasName = cleanCells.some(c => c.includes('name'));
                const hasDate = cleanCells.some(c => c.includes('date'));

                // If it has at least the Employee ID OR (Name + Date), we assume this is the header row
                if (hasEmpId || (hasName && hasDate)) {
                    headerRowIndex = i;
                    mappedHeaders = row.map(h => String(h || '').trim()); // Save original headers for mapping
                    break;
                }
            }

            if (headerRowIndex === -1) {
                // Log the first few rows to the server console to help debug
                console.error('❌ Failed to find headers. Raw top rows:', rawData.slice(0, 5));
                sendSuccess(
                    res,
                    null,
                    'Could not locate header row. Please ensure columns like EmployeeID, Name, and Date exist in your Excel file.',
                    400
                );
                return;
            }

            console.log(`✅ Found headers at row ${headerRowIndex + 1}:`, mappedHeaders);

            // 3. Extract data rows
            const dataRows = rawData.slice(headerRowIndex + 1);

            // 4. Helper function to convert Excel time fractions to HH:mm format
            const formatExcelTime = (val: any): string => {
                if (val === undefined || val === null || val === '') return '';
                
                // If Excel parsed it as a fraction of a day (e.g., 0.375 for 9:00 AM)
                if (typeof val === 'number' && val >= 0 && val < 1) {
                    const totalMinutes = Math.round(val * 24 * 60);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
                
                // If it's already a string (e.g., "09:00"), return as-is
                return String(val).trim();
            };

            // 5. Map the data safely
            const attendanceRecords = dataRows.map((rowArray) => {
                // Skip completely empty rows
                if (!rowArray || rowArray.length === 0 || rowArray.every(cell => !cell || String(cell).trim() === '')) {
                    return null;
                }

                // Helper to find value based on aggressive string matching
                const getVal = (possibleKeys: string[]): any => {
                    const index = mappedHeaders.findIndex(h => {
                        const cleanH = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
                        return possibleKeys.some(pk => {
                            const cleanPk = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
                            return cleanH.includes(cleanPk) || cleanPk.includes(cleanH);
                        });
                    });
                    return index !== -1 ? rowArray[index] : undefined;
                };

                const empId = getVal(['EmployeeID', 'ID', 'EmployeeId', 'EmpID']);
                const name = getVal(['Name', 'EmployeeName', 'Employee']);
                const dateVal = getVal(['Date', 'AttendanceDate']);

                // If core fields are completely missing or empty, skip row
                if (!empId || String(empId).trim() === '' || !name || String(name).trim() === '') {
                    return null;
                }

                // Handle Excel Serial Dates
                let parsedDate = new Date();
                if (dateVal) {
                    if (!isNaN(dateVal) && typeof dateVal === 'number') {
                        parsedDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                    } else {
                        parsedDate = new Date(dateVal);
                    }
                }

                // Validate parsed date
                if (isNaN(parsedDate.getTime())) {
                    parsedDate = new Date(); // Fallback to current date if invalid
                }

                const department = getVal(['Department', 'Dept']) || '';
                const day = getVal(['Day', 'WeekDay']) || '';
                const checkIn = formatExcelTime(getVal(['CheckIn', 'TimeIn', 'ClockIn', 'InTime']));
                const checkOut = formatExcelTime(getVal(['CheckOut', 'TimeOut', 'ClockOut', 'OutTime']));
                
                // Normalize status
                let status = String(getVal(['Status', 'AttendanceStatus']) || '').trim();
                
                // Map common status values
                const statusMap: Record<string, string> = {
                    'p': 'Present',
                    'present': 'Present',
                    'a': 'Absent',
                    'absent': 'Absent',
                    'l': 'Late',
                    'late': 'Late',
                    'h': 'Half-day',
                    'half-day': 'Half-day',
                    'halfday': 'Half-day',
                    'leave': 'Leave',
                };
                if (status && statusMap[status.toLowerCase()]) {
                    status = statusMap[status.toLowerCase()];
                }
                
                const notes = getVal(['Notes', 'Note', 'Remarks', 'Comment']) || '';

                return {
                    employeeId: String(empId).trim().replace(/^[#\s]*/, ''), // Clean leading hash/spaces if exists in data
                    name: String(name).trim(),
                    department: String(department).trim(),
                    date: parsedDate.toISOString(),
                    day: String(day).trim(),
                    checkIn: String(checkIn).trim(),
                    checkOut: String(checkOut).trim(),
                    status: status as 'Present' | 'Absent' | 'Late' | 'Half-day' | 'Leave' | '',
                    notes: String(notes).trim(),
                };
            }).filter(Boolean) as any[]; // Remove null entries

            if (attendanceRecords.length === 0) {
                sendSuccess(
                    res,
                    null,
                    'No valid data rows found beneath the headers. Ensure your Excel file has data in EmployeeID, Name, and Date columns.',
                    400
                );
                return;
            }

            console.log(`📊 Parsed ${attendanceRecords.length} attendance records from ${dataRows.length} data rows`);

            // 1. Extract all unique Employee IDs from the parsed sheet
            const uniqueEmployeeIds = [...new Set(attendanceRecords.map(r => r.employeeId))];

            // 2. Fetch all matching users from the database to validate them
            const User = mongoose.model('User');
            const existingUsers = await User.find({ employeeId: { $in: uniqueEmployeeIds } }).select('_id employeeId');

            // Create a map for quick lookup: { 'EMP-001': '60d5ec...', ... }
            const userMap = new Map(existingUsers.map((u: any) => [u.employeeId, u._id.toString()]));

            console.log(`🔗 Linked ${existingUsers.length} out of ${uniqueEmployeeIds.length} unique employees to User accounts`);

            // 3. Prepare Bulk Operations (Upsert)
            const bulkOps: any[] = [];
            let unlinkedCount = 0;

            attendanceRecords.forEach(record => {
                const matchedUserId = userMap.get(record.employeeId);
                
                // Track unlinked employees for reporting
                if (!matchedUserId) {
                    unlinkedCount++;
                }

                // Prepare the update payload
                const updatePayload = {
                    employeeId: record.employeeId,
                    name: record.name,
                    department: record.department,
                    date: record.date,
                    day: record.day,
                    checkIn: record.checkIn,
                    checkOut: record.checkOut,
                    status: record.status,
                    notes: record.notes,
                    userId: matchedUserId || null, // Link if found, null if not
                    uploadedAt: new Date(), // Acts as a batch timestamp
                };

                // Upsert logic: Match by employeeId AND date
                // Start of the day and end of the day to ensure precise date matching
                const recordDate = new Date(record.date);
                const startOfDay = new Date(recordDate);
                startOfDay.setUTCHours(0, 0, 0, 0);
                const endOfDay = new Date(recordDate);
                endOfDay.setUTCHours(23, 59, 59, 999);

                bulkOps.push({
                    updateOne: {
                        filter: { 
                            employeeId: record.employeeId, 
                            date: { $gte: startOfDay, $lte: endOfDay } 
                        },
                        update: { $set: updatePayload },
                        upsert: true // Insert if it doesn't exist, update if it does
                    }
                });
            });

            if (bulkOps.length === 0) {
                sendSuccess(res, null, 'No valid records to process', 400);
                return;
            }

            // 4. Execute the bulk write
            const Attendance = mongoose.model('Attendance');
            const result = await Attendance.bulkWrite(bulkOps);

            // Clean up uploaded file
            fs.unlink(filePath, () => {});

            console.log(`✅ Bulk write complete - Inserted: ${result.upsertedCount}, Updated: ${result.modifiedCount}`);

            sendSuccess(
                res,
                {
                    totalProcessed: attendanceRecords.length,
                    inserted: result.upsertedCount,
                    updated: result.modifiedCount,
                    unlinkedEmployees: unlinkedCount,
                    skippedRows: dataRows.length - attendanceRecords.length,
                },
                `Successfully processed ${attendanceRecords.length} attendance records (${result.upsertedCount} new, ${result.modifiedCount} updated)`,
                200
            );
        } catch (parseError) {
            // Clean up file on error
            fs.unlink(filePath, () => {});
            throw parseError;
        }
    } catch (e) {
        next(e);
    }
};

/**
 * GET /api/hr/attendance/employee/:employeeId
 * Get attendance history for a specific employee ID
 */
export const getByEmployeeId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getByEmployeeId(String(req.params.employeeId), req.query as Record<string, unknown>));
    } catch (e) {
        next(e);
    }
};

/**
 * GET /api/hr/attendance/user/:userId
 * Get attendance history for a specific user (by internal userId)
 */
export const getByUserId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getByUserId(String(req.params.userId), req.query as Record<string, unknown>));
    } catch (e) {
        next(e);
    }
};

/**
 * GET /api/hr/attendance/stats/:userId
 * Get attendance statistics for an employee
 */
export const getEmployeeStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { year, month } = req.query;
        const stats = await svc.getEmployeeStats(
            String(req.params.userId),
            year ? Number(year) : undefined,
            month ? Number(month) : undefined
        );
        sendSuccess(res, stats);
    } catch (e) {
        next(e);
    }
};
