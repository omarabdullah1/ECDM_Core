import SalesTarget from '../models/sales-target.model';
import SalesOrder from '../models/sales-order.model';
import User from '../../auth/auth.model';
import { CreateSalesTargetInput, UpdateSalesTargetInput } from '../validation/sales-target.validation';
import { ISalesTargetDocument } from '../types/sales-target.types';
import { AppError } from '../../../utils/apiError';
import { QuotationStatus, SecondFollowUpStatus, ThirdFollowUpStatus } from '../types/sales-order.types';

/**
 * Create or update (upsert) a sales target for a given salesperson/month/year.
 * If a target already exists for that period it is updated in-place instead of throwing.
 */
export const create = async (data: CreateSalesTargetInput): Promise<ISalesTargetDocument> => {
    // ── Upsert: find existing target for this salesperson/month/year ──
    const existing = await SalesTarget.findOne({
        salespersonId: data.salespersonId,
        month: data.month,
        year: data.year,
    });

    let target: ISalesTargetDocument;

    if (existing) {
        // Update the amount on the existing record
        existing.targetAmount = data.targetAmount;
        target = await existing.save();
    } else {
        // No record yet — create a fresh one
        target = await SalesTarget.create(data);
    }

    // ── Sync target to the User document for global data access ──
    const salesperson = await User.findById(data.salespersonId);
    if (salesperson) {
        const syncField: Record<string, number> = {};
        if (salesperson.role === 'Marketing') {
            syncField.targetBudget = data.targetAmount;
        } else {
            // Sales, Manager, SuperAdmin, Admin
            syncField.targetSales = data.targetAmount;
        }
        await User.findByIdAndUpdate(data.salespersonId, { $set: syncField });
    }

    return target;
};

/**
 * Get all sales targets with optional filtering
 */
export const getAll = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, salespersonId, month, year } = query;
    const filter: Record<string, unknown> = {};

    if (salespersonId) filter.salespersonId = salespersonId;
    if (month) filter.month = month;
    if (year) filter.year = year;

    const skip = (Number(page) - 1) * Number(limit);
    const data = await SalesTarget.find(filter)
        .populate('salespersonId', 'firstName lastName email')
        .skip(skip)
        .limit(Number(limit))
        .sort({ year: -1, month: -1 });

    const total = await SalesTarget.countDocuments(filter);

    return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    };
};

/**
 * Get a single sales target by ID
 */
export const getById = async (id: string): Promise<ISalesTargetDocument | null> => {
    const target = await SalesTarget.findById(id).populate('salespersonId', 'firstName lastName email');
    if (!target) throw new AppError('Sales target not found', 404);
    return target;
};

/**
 * Update a sales target
 */
export const update = async (id: string, data: UpdateSalesTargetInput): Promise<ISalesTargetDocument | null> => {
    const target = await SalesTarget.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!target) throw new AppError('Sales target not found', 404);

    // ── Sync updated target amount to the User document ──
    if (data.targetAmount !== undefined) {
        const salesperson = await User.findById(target.salespersonId);
        if (salesperson) {
            const syncField: Record<string, number> = {};
            if (salesperson.role === 'Marketing') {
                syncField.targetBudget = data.targetAmount;
            } else {
                syncField.targetSales = data.targetAmount;
            }
            await User.findByIdAndUpdate(target.salespersonId, { $set: syncField });
        }
    }

    return target;
};

/**
 * Delete a sales target
 */
export const remove = async (id: string): Promise<void> => {
    const target = await SalesTarget.findByIdAndDelete(id);
    if (!target) throw new AppError('Sales target not found', 404);
};

/**
 * Calculate performance for a salesperson for a specific month/year
 * Returns target amount, achieved amount, and progress percentage
 */
export const calculatePerformance = async (salespersonId: string, month?: number, year?: number) => {
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    // 1. Get the target for this month/year
    const targetDoc = await SalesTarget.findOne({
        salespersonId,
        month: targetMonth,
        year: targetYear,
    });

    const targetAmount = targetDoc ? targetDoc.targetAmount : 0;

    // 2. Calculate achieved amount from Sales Orders
    // An order counts if any of the 3 follow-up statuses equals 'Accepted', 'Scheduled', or (not 'NotPotential')
    const wonOrders = await SalesOrder.find({
        salesPerson: salespersonId, // Note: using salesPerson field once it's added to the model
        $or: [
            { quotationStatusFirstFollowUp: QuotationStatus.Accepted },
            { statusSecondFollowUp: SecondFollowUpStatus.Scheduled },
            { 
                finalStatusThirdFollowUp: ThirdFollowUpStatus.Accepted,
            },
        ],
    });

    // Sum up the quotation grandTotal values
    const achievedAmount = wonOrders.reduce((sum, order) => {
        const quotationValue = order.quotation?.grandTotal || 0;
        return sum + quotationValue;
    }, 0);

    const progressPercentage = targetAmount > 0 
        ? Math.min(Math.round((achievedAmount / targetAmount) * 100), 100) 
        : 0;

    return {
        targetAmount,
        achievedAmount,
        progressPercentage,
        month: targetMonth,
        year: targetYear,
    };
};
