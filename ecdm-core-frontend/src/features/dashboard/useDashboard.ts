'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/axios';

/* ─── Types matching the backend response shape ────────────────────── */

export interface DashboardKpis {
    activeClients: number;
    activeCustomers: number;
    clientGrowthPct: string;
    revenueThisMonth: number;
    revenueTrendPct: string;
    activeWorkOrders: number;
    lowStockProducts: number;
    lowStockItems: number;
    totalLowStock: number;
}

export interface LeadStatusItem {
    status: string;
    count: number;
}

export interface OrderStatusItem {
    status: string;
    count: number;
}

export interface PunctualityData {
    onTime: number;
    late: number;
    total: number;
    onTimePct: number;
    latePct: number;
}

export interface CampaignItem {
    _id: string;
    name: string;
    platform: string;
    impressions: number;
    conversions: number;
    salesRevenue: number;
    startDate: string | null;
    endDate: string | null;
}

export interface FollowUpItem {
    _id: string;
    customer: { _id: string; name: string; phone?: string } | null;
    csr: { _id: string; firstName: string; lastName: string } | null;
    workOrder: { _id: string; typeOfOrder: string; issue: string } | null;
    followUpDate: string;
    solvedIssue: boolean;
    reasonForNotSolving?: string;
    notes?: string;
    createdAt: string;
}

export interface DelayedOrderItem {
    _id: string;
    customer: { _id: string; name: string; phone?: string } | null;
    assignedEngineer: { _id: string; firstName: string; lastName: string } | null;
    typeOfOrder: string;
    issue: string;
    visitSiteDate?: string;
    startMaintenanceDate?: string;
    lateDuration?: number;
    lateDurationType?: string;
    reasonForDelay?: string;
    createdAt: string;
}

export interface FeedbackItem {
    _id: string;
    customer: { _id: string; name: string } | null;
    engineer: { _id: string; firstName: string; lastName: string } | null;
    workOrder: { _id: string; typeOfOrder: string } | null;
    ratingOperation: number;
    ratingCustomerService: number;
    notes?: string;
    createdAt: string;
}

export interface DashboardData {
    kpis: DashboardKpis;
    charts: {
        leadsByStatus: LeadStatusItem[];
        ordersByQuotation: OrderStatusItem[];
        punctuality: PunctualityData;
        campaigns: CampaignItem[];
    };
    lists: {
        pendingFollowUps: FollowUpItem[];
        delayedWorkOrders: DelayedOrderItem[];
        recentFeedback: FeedbackItem[];
    };
}

export interface UseDashboardResult {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useDashboard(): UseDashboardResult {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get('/api/dashboard/stats');
            setData(res.data?.data ?? res.data);
        } catch (err: unknown) {
            setError((err as Error).message ?? 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetch(); }, []);

    return { data, loading, error, refetch: fetch };
}
