import { Salary } from '../models/salary.model';
import { AppError } from '../../../utils/apiError';
import User from '../../auth/auth.model'; 
import Attendance from '../../hr/models/attendance.model';
import { Types } from 'mongoose';
import { AttendanceStatus } from '../../hr/types/attendance.types';
import * as expenseService from './expense.service';

const DAILY_SALARY_DIVISOR = 30;
const LATE_DEDUCTION_RATE = 0.05;
const ABSENT_DEDUCTION_RATE = 1.0;
const HALF_DAY_DEDUCTION_RATE = 0.5;

interface SalaryGenerationInput {
  employeeId: string;
  month: number;
  year: number;
  allowances?: number;
  overtime?: number;
  bonuses?: number;
  tax?: number;
  insurance?: number;
  notes?: string;
  user?: any; // Pre-fetched user object to avoid redundant lookups
}

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
}

interface MonthlySalaryResult {
  generated: number;
  updated: number;
  failed: number;
  errors: string[];
}

interface SalaryPreview {
  employeeId: Types.ObjectId;
  employeeName: string;
  department: string;
  basicSalary: number;
  attendanceDetails: AttendanceSummary;
  grossSalary: number;
  totalDeductions: number;
  absenceDeduction: number;
  netSalary: number;
  hasExistingSalary: boolean;
}

interface PreviewResult {
  month: number;
  year: number;
  totalEmployees: number;
  employeesWithExistingSalary: number;
  previewCount: number;
  previews: SalaryPreview[];
}

export const create = async (data: any) => {
  return Salary.create(data);
};

export const getAll = async (query: Record<string, unknown>) => {
  const { page = 1, limit = 1000, month, year, employeeId } = query;
  const skip = (Number(page) - 1) * Number(limit);
  
  const filter: Record<string, unknown> = {};
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  if (employeeId) filter.employeeId = employeeId;
  
  const [data, total] = await Promise.all([
    Salary.find(filter)
      .populate('employeeId', 'firstName lastName email department role employeeId')
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Salary.countDocuments(filter),
  ]);
  
  return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getById = async (id: string) => {
  const salary = await Salary.findById(id).populate('employeeId', 'firstName lastName email department role employeeId');
  if (!salary) throw new AppError('Salary not found', 404);
  return salary;
};

export const update = async (id: string, data: any) => {
  const salary = await Salary.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!salary) throw new AppError('Salary not found', 404);
  return salary;
};

export const remove = async (id: string) => {
  const salary = await Salary.findByIdAndDelete(id);
  if (!salary) throw new AppError('Salary not found', 404);
};

export const getByEmployeeId = async (employeeId: string, query: Record<string, unknown> = {}) => {
  const { page = 1, limit = 12 } = query;
  const skip = (Number(page) - 1) * Number(limit);
  
  const [data, total] = await Promise.all([
    Salary.find({ employeeId: new Types.ObjectId(employeeId) })
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Salary.countDocuments({ employeeId: new Types.ObjectId(employeeId) }),
  ]);
  
  return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

const getAttendanceSummary = async (employeeId: Types.ObjectId, month: number, year: number): Promise<AttendanceSummary> => {
  // Use today as upper limit for mid-month calculation
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = isCurrentMonth 
    ? now // Stop at today if it's the current month
    : new Date(year, month, 0, 23, 59, 59); // Otherwise go to end of month
  
  const records = await Attendance.find({
    userId: employeeId,
    date: { $gte: startDate, $lte: endDate },
  });
  
  const summary: AttendanceSummary = {
    totalDays: records.length,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
  };
  
  records.forEach((record: any) => {
    switch (record.status) {
      case AttendanceStatus.Present:
        summary.presentDays++;
        break;
      case AttendanceStatus.Absent:
        summary.absentDays++;
        break;
      case AttendanceStatus.Late:
        summary.lateDays++;
        summary.presentDays++;
        break;
      case AttendanceStatus.HalfDay:
        summary.halfDays++;
        break;
      case AttendanceStatus.Leave:
        summary.presentDays++;
        break;
    }
  });
  
  return summary;
};

const calculateAbsenceDeduction = (basicSalary: number, summary: AttendanceSummary): number => {
  const dailySalary = basicSalary / DAILY_SALARY_DIVISOR;
  const lateDeduction = dailySalary * summary.lateDays * LATE_DEDUCTION_RATE;
  const absentDeduction = dailySalary * summary.absentDays * ABSENT_DEDUCTION_RATE;
  const halfDayDeduction = dailySalary * summary.halfDays * HALF_DAY_DEDUCTION_RATE;
  return Math.round((lateDeduction + absentDeduction + halfDayDeduction) * 100) / 100;
};

export const generateEmployeeSalary = async (input: SalaryGenerationInput): Promise<any> => {
  // Use passed user object or fetch it
  const user = input.user || await User.findById(input.employeeId);
  if (!user) {
    throw new AppError('Employee (User) not found', 404);
  }
  
  const existingSalary = await Salary.findOne({
    employeeId: user._id,
    month: input.month,
    year: input.year,
  });
  
  const summary = await getAttendanceSummary(user._id, input.month, input.year);
  const basicSalary = user.salary || 0;
  const absenceDeduction = calculateAbsenceDeduction(basicSalary, summary);
  
  const salaryData: any = {
    employeeId: user._id,
    employeeName: `${user.firstName} ${user.lastName}`,
    department: user.department || 'Unknown',
    basicSalary,
    absenceDeduction: Math.round(absenceDeduction * 100) / 100,
    month: input.month,
    year: input.year,
    autoGenerated: true,
    attendanceDetails: summary,
  };

  const salary = existingSalary ? 
    await Salary.findByIdAndUpdate(existingSalary._id, salaryData, { new: true }) :
    await Salary.create(salaryData);

  // AUTOMATIC EXPENSE LOGGING
  // We use source + relatedRecordId + employeeId as unique criteria for upsert
  const netSalaryAmount = (salary.basicSalary || 0) + (salary.allowances || 0) + (salary.overtime || 0) + (salary.bonuses || 0) - 
                    ((salary.absenceDeduction || 0) + (salary.tax || 0) + (salary.insurance || 0) + (salary.otherDeductions || 0));

  await expenseService.upsertExpense(
    { source: 'Salary', relatedRecordId: salary._id },
    {
      expenseType: 'Salaries',
      expenseDate: new Date(),
      description: `Monthly Salary - ${user.firstName} ${user.lastName} (${input.month}/${input.year})`,
      amount: netSalaryAmount,
      paymentMethod: 'Bank Transfer', // Default for salaries
      paidBy: 'System Auto-Generated',
      employeeId: user._id,
      source: 'Salary',
      relatedRecordId: salary._id,
      notes: `Auto-logged from Payroll module for period ${input.month}/${input.year}`
    }
  );

  return salary;
};


export const generateMonthlySalaries = async (
  month: number,
  year: number,
  options?: {
    department?: string;
    employeeIds?: string[];
  }
): Promise<MonthlySalaryResult> => {
  const filter: any = { isActive: { $ne: false } };
  
  if (options?.department) {
    filter.department = options.department;
  }
  
  if (options?.employeeIds?.length) {
    filter._id = { $in: options.employeeIds.map((id: string) => new Types.ObjectId(id)) };
  }
  
  console.log(`[SalaryService] Processing monthly payroll for ${month}/${year}. Filter:`, JSON.stringify(filter));
  const users = await User.find(filter);
  
  const results: MonthlySalaryResult = {
    generated: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };
  
  for (const user of users) {
    try {
      const existing = await Salary.findOne({
        employeeId: user._id,
        month,
        year,
      });

      await generateEmployeeSalary({
        employeeId: user._id.toString(),
        user,
        month,
        year,
      });

      if (existing) {
        results.updated++;
      } else {
        results.generated++;
      }
    } catch (error: any) {
      results.failed++;
      results.errors.push(error.message);
      console.log(`[SalaryService] Sync fail for ${user.firstName}: ${error.message}`);
    }
  }
  
  return results;
};

export const getSalaryStats = async (month?: number, year?: number) => {
  const filter: Record<string, unknown> = {};
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  
  const stats = await Salary.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalSalaries: { $sum: '$basicSalary' },
        totalAllowances: { $sum: '$allowances' },
        totalDeductions: { $sum: { $add: ['$absenceDeduction', '$tax', '$insurance', '$otherDeductions'] } },
        totalNetSalary: { $sum: { $subtract: [
          { $add: ['$basicSalary', '$allowances', '$overtime', '$bonuses'] },
          { $add: ['$absenceDeduction', '$tax', '$insurance', '$otherDeductions'] }
        ]}},
        employeeCount: { $sum: 1 },
        avgSalary: { $avg: '$basicSalary' },
      },
    },
  ]);
  
  return stats[0] || {
    totalSalaries: 0,
    totalAllowances: 0,
    totalDeductions: 0,
    totalNetSalary: 0,
    employeeCount: 0,
    avgSalary: 0,
  };
};

export const previewSalaries = async (month: number, year: number): Promise<PreviewResult> => {
  const filter: any = { isActive: { $ne: false } };
  const users = await User.find(filter);
  const previews: SalaryPreview[] = [];
  let employeesWithExistingSalary = 0;

  for (const user of users) {
    const existingSalary = await Salary.findOne({
      employeeId: user._id,
      month,
      year,
    });

    if (existingSalary) {
      employeesWithExistingSalary++;
      const grossSalary = (existingSalary.basicSalary || 0) + (existingSalary.allowances || 0) +
                          (existingSalary.overtime || 0) + (existingSalary.bonuses || 0);
      const totalDeductions = (existingSalary.absenceDeduction || 0) + (existingSalary.tax || 0) +
                               (existingSalary.insurance || 0) + (existingSalary.otherDeductions || 0);
      const netSalary = grossSalary - totalDeductions;

      previews.push({
        employeeId: user._id,
        employeeName: `${user.firstName} ${user.lastName}`,
        department: user.department || 'Unknown',
        basicSalary: existingSalary.basicSalary,
        attendanceDetails: existingSalary.attendanceDetails || {
          totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, halfDays: 0
        },
        grossSalary,
        totalDeductions,
        absenceDeduction: existingSalary.absenceDeduction,
        netSalary,
        hasExistingSalary: true,
      });
      continue;
    }

    const summary = await getAttendanceSummary(user._id, month, year);
    const basicSalary = user.salary || 0;
    const absenceDeduction = calculateAbsenceDeduction(basicSalary, summary);
    const netSalary = basicSalary - absenceDeduction;

    previews.push({
      employeeId: user._id,
      employeeName: `${user.firstName} ${user.lastName}`,
      department: user.department || 'Unknown',
      basicSalary,
      attendanceDetails: summary,
      grossSalary: basicSalary,
      totalDeductions: absenceDeduction,
      absenceDeduction,
      netSalary,
      hasExistingSalary: false,
    });
  }

  return {
    month,
    year,
    totalEmployees: users.length,
    employeesWithExistingSalary,
    previewCount: previews.filter(p => !p.hasExistingSalary).length,
    previews,
  };
};

