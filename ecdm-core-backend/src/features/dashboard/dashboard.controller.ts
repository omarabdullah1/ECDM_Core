import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import mongoose from 'mongoose';

// ── Models ──────────────────────────────────────────────────────────
import Customer from '../shared/models/contact.model';
import MarketingLead from '../marketing/models/marketing-lead.model';
import SalesOrder from '../sales/models/sales-order.model';
import WorkOrder from '../operations/models/work-order.model';
import FollowUp from '../customer/models/follow-up.model';
import Feedback from '../customer/models/feedback.model';
import Campaign from '../marketing/models/campaign.model';
import Invoice from '../finance/models/invoice.model';
import Product from '../operations/models/product.model';

import InventoryItem from '../operations/models/inventory-item.model';
import { InventoryFinance } from '../finance/models/inventory-finance.model';
import User from '../auth/auth.model';

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/stats
// Returns all KPI + chart + list data for the Super Admin dashboard
// ═══════════════════════════════════════════════════════════════════
export const getStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // ── Run all aggregations in parallel ────────────────────────
        const [
            // KPI: Active customers this month
            activeClients,
            activeClientsLastMonth,
            // KPI: Active customers (VIP)
            activeCustomers,
            // KPI: Revenue (paid invoices this month)
            revenueThisMonth,
            revenueLastMonth,
            // KPI: Active work orders (no endMaintenanceDate yet)
            activeWorkOrders,
            // KPI: Low stock — products
            lowStockProducts,
            // KPI: Low stock — inventory items (spare parts)
            lowStockItems,
            // Chart: Sales pipeline — leads by status
            leadsByStatus,
            // Chart: Sales orders by quotation status
            ordersByQuotation,
            // Chart: Ops punctuality
            punctualityStats,
            // Chart: Campaign marketing data
            campaignData,
            // List: Pending follow-ups (unsolved, soonest first)
            pendingFollowUps,
            // List: Delayed work orders
            delayedWorkOrders,
            // List: Recent feedback
            recentFeedback,
        ] = await Promise.all([
            // ── KPI queries ─────────────────────────────────────
            Customer.countDocuments({ status: { $in: ['Active', 'VIP'] }, createdAt: { $gte: startOfMonth } }),
            Customer.countDocuments({ status: { $in: ['Active', 'VIP'] }, createdAt: { $lt: startOfMonth } }),
            Customer.countDocuments({ status: 'VIP' }),

            Invoice.aggregate([
                { $match: { status: 'Approved', createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$grandTotal' } } },
            ]),
            Invoice.aggregate([
                { $match: { status: 'Approved', createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } } },
                { $group: { _id: null, total: { $sum: '$grandTotal' } } },
            ]),

            WorkOrder.countDocuments({ $or: [{ endMaintenanceDate: null }, { endMaintenanceDate: { $exists: false } }] }),

            Product.countDocuments({
                $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
                isActive: true,
            }),
            InventoryItem.countDocuments({ status: { $in: ['Sold out', 'Repurchase needed'] } }),

            // ── Chart: Marketing leads by status ──────────────
            MarketingLead.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),

            // ── Chart: Sales orders by quotation status ─────────
            SalesOrder.aggregate([
                { $group: { _id: '$quotationStatus', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),

            // ── Chart: Punctuality ──────────────────────
            WorkOrder.aggregate([
                { $match: { punctuality: { $in: ['Same time', 'Late'] } } },
                { $group: { _id: '$punctuality', count: { $sum: 1 } } },
            ]),

            // ── Chart: Campaign data (current campaigns) ────────
            Campaign.find({ status: 'Current' })
                .select('name platform impressions conversions salesRevenue startDate endDate')
                .sort({ startDate: -1 })
                .limit(30)
                .lean(),

            // ── List: Pending follow-ups ────────────────────────
            FollowUp.find({ solvedIssue: false })
                .populate('customer', 'name phone')
                .populate('csr', 'firstName lastName')
                .populate('workOrder', 'typeOfOrder issue')
                .sort({ followUpDate: 1 })
                .limit(10)
                .lean(),

            // ── List: Delayed work orders ───────────────────────
            WorkOrder.find({
                punctuality: 'Late',
                $or: [{ endMaintenanceDate: null }, { endMaintenanceDate: { $exists: false } }],
            })
                .populate({
                    path: 'customerOrderId',
                    select: 'customerId issue typeOfOrder',
                    populate: { path: 'customerId', select: 'name phone' }
                })
                .select('maintenanceEngineer reasonForDelay createdAt startMaintenanceDate taskDate notes')
                .sort({ createdAt: 1 })
                .limit(10)
                .lean(),

            // ── List: Recent feedback ───────────────────────────
            Feedback.find()
                .populate('customerId', 'name')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
        ]);

        // ── Shape KPI results ───────────────────────────────────────
        const revThisMonth = revenueThisMonth[0]?.total ?? 0;
        const revLastMonth = revenueLastMonth[0]?.total ?? 0;
        const revTrend = revLastMonth > 0
            ? (((revThisMonth - revLastMonth) / revLastMonth) * 100).toFixed(1)
            : revThisMonth > 0 ? '100' : '0';

        const clientGrowth = activeClientsLastMonth > 0
            ? (((activeClients - activeClientsLastMonth) / activeClientsLastMonth) * 100).toFixed(1)
            : activeClients > 0 ? '100' : '0';

        const totalLowStock = lowStockProducts + lowStockItems;

        // ── Shape punctuality ────────────────────────────────────────
        const onTimeCount = punctualityStats.find((p: { _id: string; count: number }) => p._id === 'Same time')?.count ?? 0;
        const lateCount2  = punctualityStats.find((p: { _id: string; count: number }) => p._id === 'Late')?.count ?? 0;
        const punctualityTotal = onTimeCount + lateCount2;

        // ── Response ────────────────────────────────────────────────
        sendSuccess(res, {
            kpis: {
                activeClients,
                activeCustomers,
                clientGrowthPct: clientGrowth,
                revenueThisMonth: revThisMonth,
                revenueTrendPct: revTrend,
                activeWorkOrders,
                lowStockProducts,
                lowStockItems,
                totalLowStock,
            },
            charts: {
                leadsByStatus: leadsByStatus.map((l: { _id: string; count: number }) => ({
                    status: l._id,
                    count: l.count,
                })),
                ordersByQuotation: ordersByQuotation.map((o: { _id: string; count: number }) => ({
                    status: o._id,
                    count: o.count,
                })),
                punctuality: {
                    onTime: onTimeCount,
                    late: lateCount2,
                    total: punctualityTotal,
                    onTimePct: punctualityTotal > 0 ? Math.round((onTimeCount / punctualityTotal) * 100) : 0,
                    latePct: punctualityTotal > 0 ? Math.round((lateCount2 / punctualityTotal) * 100) : 0,
                },
                campaigns: campaignData,
            },
            lists: {
                pendingFollowUps,
                delayedWorkOrders,
                recentFeedback,
            },
        }, 'Dashboard data loaded');
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/summary
// Optimized single-query summary using MongoDB Aggregation Pipeline
// Returns: totalSales, lowStockAlerts, recentActivities in one request
// ═══════════════════════════════════════════════════════════════════
export const getSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLast7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const db = mongoose.connection.db;
        const summary = db ? await db.collection('summary_view').findOne({}).catch(() => null) : null;

        const [
            realRevenueThisMonth,
            projectedRevenueThisMonth,
            lowStockAlerts,
            pendingFollowUpsCount,
            activeWorkOrdersCount,
            totalInventoryValue,
            totalCompanySalesTarget,
            totalCompanyMarketingBudget,
        ] = await Promise.all([
            Invoice.aggregate([
                { $match: { status: 'Approved', createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$grandTotal' } } },
            ]),
            Invoice.aggregate([
                { $match: { status: 'Pending', createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$grandTotal' } } },
            ]),
            Product.aggregate([
                { $match: { isActive: true } },
                { $addFields: { stockRatio: { $divide: ['$currentStock', { $ifNull: ['$lowStockThreshold', 1] }] } } },
                { $match: { $expr: { $lte: ['$stockRatio', 1] } } },
                { $group: { _id: null, count: { $sum: 1 }, items: { $push: { name: '$name', sku: '$sku', stock: '$currentStock', threshold: '$lowStockThreshold' } } } },
            ]),
            FollowUp.countDocuments({ solvedIssue: false }),
            WorkOrder.countDocuments({ $or: [{ endMaintenanceDate: null }, { endMaintenanceDate: { $exists: false } }] }),
            InventoryFinance.aggregate([
                { $match: { status: { $ne: 'Sold out' } } },
                { $group: { _id: null, totalValue: { $sum: { $multiply: ['$stockNumber', '$price'] } } } },
            ]),
            User.aggregate([
                { $match: { role: { $in: ['Sales'] } } },
                { $group: { _id: null, total: { $sum: { $ifNull: [{ $toDouble: '$targetSales' }, 0] } } } },
            ]),
            User.aggregate([
                { $match: { role: { $in: ['Marketing'] } } },
                { $group: { _id: null, total: { $sum: { $ifNull: [{ $toDouble: '$targetBudget' }, 0] } } } },
            ]),
        ]);

        console.log('[Dashboard] User targets:', {
            salesTarget: totalCompanySalesTarget,
            marketingBudget: totalCompanyMarketingBudget
        });

        // Debug: Check User model fields
        console.log('[Dashboard] Debug - totalCompanySalesTarget[0]:', totalCompanySalesTarget[0]);
        console.log('[Dashboard] Debug - totalCompanyMarketingBudget[0]:', totalCompanyMarketingBudget[0]);

        let recentActivities: unknown[] = [];
        if (db) {
            try {
                recentActivities = await db.collection('auditlogs').aggregate([
                    { $match: { createdAt: { $gte: startOfLast7Days } } },
                    { $sort: { createdAt: -1 } },
                    { $limit: 20 },
                    { $project: { action: 1, entity: 1, userId: 1, createdAt: 1, details: 1 } },
                ]).toArray();
            } catch {
                recentActivities = [];
            }
        }

        sendSuccess(res, {
            financialMetrics: {
                realRevenueThisMonth: realRevenueThisMonth[0]?.total ?? 0,
                projectedRevenueThisMonth: projectedRevenueThisMonth[0]?.total ?? 0,
                totalInventoryValue: totalInventoryValue[0]?.totalValue ?? 0,
            },
            totalSales: summary?.totalSales ?? 0,
            totalSalesThisMonth: summary?.revenueThisMonth ?? 0,
            lowStockAlerts: {
                count: lowStockAlerts[0]?.count ?? 0,
                items: lowStockAlerts[0]?.items?.slice(0, 5) ?? [],
            },
            recentActivities,
            pendingFollowUpsCount,
            activeWorkOrdersCount,
            quickStats: {
                totalCustomers: summary?.totalCustomers ?? 0,
                totalInvoices: summary?.totalInvoices ?? 0,
                totalWorkOrders: summary?.totalWorkOrders ?? 0,
            },
            totalCompanySalesTarget: totalCompanySalesTarget[0]?.total ?? 0,
            totalCompanyMarketingBudget: totalCompanyMarketingBudget[0]?.total ?? 0,
        }, 'Dashboard summary loaded');
    } catch (err) {
        next(err);
    }
};
