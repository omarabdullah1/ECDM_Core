import { AppError } from '../../../utils/apiError';
import PurchaseOrder, { PurchaseOrderStatus } from '../models/purchase-order.model';
import { adjustStock, receiveStockAndCost } from './inventory.service';
import mongoose from 'mongoose';

/**
 * PurchaseOrder Service — Business Logic Layer
 */

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const create = async (data: any, createdBy: string) => {
    // Map items to ensure unitPrice and total are present
    const mappedItems = (data.items || []).map((item: any) => {
        const unitPrice = item.unitPrice ?? item.unitCost ?? 0;
        return {
            ...item,
            unitPrice,
            total: item.total ?? (item.quantity * unitPrice)
        };
    });

    return PurchaseOrder.create({
        ...data,
        items: mappedItems,
        createdBy,
        status: PurchaseOrderStatus.PendingFinance
    });
};

// ─── READ ALL ─────────────────────────────────────────────────────────────────

export const getAll = async (query: any, user?: any) => {
    const { page = 1, limit = 10, status, supplierName } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (supplierName) filter.supplierName = { $regex: supplierName, $options: 'i' };

    // ─── Restricted Access for Operation Members ───
    if (user?.role && (require('../../../utils/makerChecker').isOperationMember(user.role))) {
        filter.$or = [
            { createdBy:         user.userId },
            { receivedBy:        user.userId },
            { financeApprovedBy: user.userId }
        ];
    }

    const [data, total] = await Promise.all([
        PurchaseOrder.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('financeApprovedBy', 'firstName lastName')
            .populate('receivedBy', 'firstName lastName')
            .populate('items.inventoryId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        PurchaseOrder.countDocuments(filter),
    ]);

    return {
        data,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
        },
    };
};

// ─── READ BY ID ───────────────────────────────────────────────────────────────

export const getById = async (id: string) => {
    const po = await PurchaseOrder.findById(id)
        .populate('createdBy', 'firstName lastName')
        .populate('items.inventoryId');
    if (!po) throw new AppError('Purchase Order not found', 404);
    return po;
};

// ─── APPROVE BY FINANCE ───────────────────────────────────────────────────────

export const approveByFinance = async (id: string, userId: string) => {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw new AppError('Purchase Order not found', 404);

    if (po.status !== PurchaseOrderStatus.PendingFinance) {
        throw new AppError(`Cannot approve PO in ${po.status} status`, 400);
    }

    if (!po.supplierName) {
        throw new AppError('Please edit the PO and add a Supplier Name before approving.', 400);
    }
    
    if (po.items.some(item => !item.unitPrice || item.unitPrice <= 0)) {
        throw new AppError('Please edit the PO and set the Unit Price for all items before approving.', 400);
    }

    po.status = PurchaseOrderStatus.ApprovedFinance;
    po.financeApprovedBy = new mongoose.Types.ObjectId(userId);
    po.financeApprovedAt = new Date();
    
    await po.save();
    return po;
};

// ─── CONFIRM RECEIPT (INCREMENTS STOCK) ───────────────────────────────────────

export const confirmReceipt = async (id: string, userId: string) => {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw new AppError('Purchase Order not found', 404);

    if (po.status !== PurchaseOrderStatus.ApprovedFinance) {
        throw new AppError('PO must be approved by Finance before confirming receipt', 400);
    }

    // 1. Mark as Received
    po.status = PurchaseOrderStatus.Received;
    po.receivedBy = new mongoose.Types.ObjectId(userId);
    po.receivedAt = new Date();

    // 2. Increment stock and update cost for each item in Inventory
    for (const item of po.items) {
        await receiveStockAndCost(item.inventoryId.toString(), item.quantity, item.unitPrice);
    }

    await po.save();
    return po;
};

// ─── REJECT ───────────────────────────────────────────────────────────────────

export const reject = async (id: string, userId: string) => {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw new AppError('Purchase Order not found', 404);

    po.status = PurchaseOrderStatus.Rejected;
    await po.save();
    return po;
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const update = async (id: string, data: any, user?: any) => {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw new AppError('Purchase Order not found', 404);

    const isAdmin = ['Admin', 'SuperAdmin'].includes(user?.role);
    if (po.status !== PurchaseOrderStatus.PendingFinance && !isAdmin) {
        throw new AppError(`Cannot update Purchase Order in ${po.status} status`, 400);
    }

    // Map items to ensure unitPrice and total are present
    if (data.items) {
        data.items = data.items.map((item: any) => {
            const unitPrice = item.unitPrice ?? item.unitCost ?? 0;
            return {
                ...item,
                unitPrice,
                total: item.total ?? (item.quantity * unitPrice)
            };
        });
        
        // Recalculate grand total amount
        data.totalAmount = data.items.reduce((acc: number, curr: any) => acc + curr.total, 0);
    }

    const updated = await PurchaseOrder.findByIdAndUpdate(id, data, { new: true })
        .populate('createdBy', 'firstName lastName')
        .populate('items.inventoryId');
        
    return updated;
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const remove = async (id: string) => {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw new AppError('Purchase Order not found', 404);

    if (po.status !== PurchaseOrderStatus.PendingFinance) {
        throw new AppError(`Cannot delete Purchase Order in ${po.status} status`, 400);
    }

    await PurchaseOrder.findByIdAndDelete(id);
    return { id };
};


