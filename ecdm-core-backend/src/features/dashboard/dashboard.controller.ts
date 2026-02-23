import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/apiResponse';

// ── Models ──────────────────────────────────────────────────────────
import Client from '../crm/client/client.model';
import Customer from '../crm/customer/customer.model';
import Lead from '../crm/lead/lead.model';
import SalesOrder from '../crm/sales-order/sales-order.model';
import WorkOrder from '../erp/work-order/work-order.model';
import FollowUp from '../erp/follow-up/follow-up.model';
import Feedback from '../erp/feedback/feedback.model';
import Campaign from '../erp/campaign/campaign.model';
import Invoice from '../erp/invoice/invoice.model';
import Product from '../../features/inventory/product/product.model';
import InventoryItem from '../../features/inventory/inventory-item/inventory-item.model';

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
            // KPI: Active clients (B2B)
            activeClients,
            activeClientsLastMonth,
            // KPI: Active customers
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
            Client.countDocuments({ status: 'Active' }),
            Client.countDocuments({ status: 'Active', createdAt: { $lt: startOfMonth } }),
            Customer.countDocuments({ status: { $in: ['Active', 'VIP'] } }),

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

            // ── Chart: Leads by status ──────────────────────────
            Lead.aggregate([
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
                .populate('customer', 'name phone')
                .populate('assignedEngineer', 'firstName lastName')
                .select('typeOfOrder issue visitSiteDate startMaintenanceDate lateDuration lateDurationType reasonForDelay createdAt')
                .sort({ createdAt: 1 })
                .limit(10)
                .lean(),

            // ── List: Recent feedback ───────────────────────────
            Feedback.find()
                .populate('customer', 'name')
                .populate('engineer', 'firstName lastName')
                .populate('workOrder', 'typeOfOrder')
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
