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
import Invoice from '../erp/invoice/invoice.model';
import Product from '../operations/models/product.model';
import InventoryItem from '../operations/models/inventory-item.model';

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
                { $match: { status: 'Paid', paidAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            Invoice.aggregate([
                { $match: { status: 'Paid', paidAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),

            WorkOrder.countDocuments({ endMaintenanceDate: null }),

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

            // ── Chart: Punctuality ──────────────────────────────
            WorkOrder.aggregate([
                { $match: { punctuality: { $in: ['On-Time', 'Late'] } } },
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
                endMaintenanceDate: null,
            })
                .populate({
                    path: 'customerOrderId',
                    select: 'customerId',
                    populate: { path: 'customerId', select: 'name phone' }
                })
                .populate('assignedEngineer', 'firstName lastName')
                .select('typeOfOrder issue visitSiteDate startMaintenanceDate lateDuration lateDurationType reasonForDelay createdAt')
                .sort({ createdAt: 1 })
                .limit(10)
                .lean(),

            // ── List: Recent feedback ───────────────────────────
            Feedback.find()
                .populate('customerId', 'name')
                .populate({
                    path: 'customerOrderId',
                    select: 'assignedEngineer typeOfOrder',
                    populate: { path: 'assignedEngineer', select: 'firstName lastName' }
                })
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
        const onTimeCount = punctualityStats.find((p: { _id: string; count: number }) => p._id === 'On-Time')?.count ?? 0;
        const lateCount = punctualityStats.find((p: { _id: string; count: number }) => p._id === 'Late')?.count ?? 0;
        const punctualityTotal = onTimeCount + lateCount;

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
                    late: lateCount,
                    total: punctualityTotal,
                    onTimePct: punctualityTotal > 0 ? Math.round((onTimeCount / punctualityTotal) * 100) : 0,
                    latePct: punctualityTotal > 0 ? Math.round((lateCount / punctualityTotal) * 100) : 0,
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
        const startOfLast7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const db = mongoose.connection.db;
        const summary = db ? await db.collection('summary_view').findOne({}).catch(() => null) : null;

        const [
            totalSales,
            lowStockAlerts,
            pendingFollowUpsCount,
            activeWorkOrdersCount,
        ] = await Promise.all([
            Invoice.aggregate([
                { $match: { status: 'Paid' } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            Product.aggregate([
                { $match: { isActive: true } },
                { $addFields: { stockRatio: { $divide: ['$currentStock', { $ifNull: ['$lowStockThreshold', 1] }] } } },
                { $match: { $expr: { $lte: ['$stockRatio', 1] } } },
                { $group: { _id: null, count: { $sum: 1 }, items: { $push: { name: '$name', sku: '$sku', stock: '$currentStock', threshold: '$lowStockThreshold' } } } },
            ]),
            FollowUp.countDocuments({ solvedIssue: false }),
            WorkOrder.countDocuments({ endMaintenanceDate: null }),
        ]);

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
            totalSales: totalSales[0]?.total ?? 0,
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
        }, 'Dashboard summary loaded');
    } catch (err) {
        next(err);
    }
};
