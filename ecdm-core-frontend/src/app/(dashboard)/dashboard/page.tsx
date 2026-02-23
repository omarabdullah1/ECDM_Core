'use client';

import { useDashboard } from '@/features/dashboard/useDashboard';
import KpiCards from '@/features/dashboard/components/KpiCards';
import SalesChart from '@/features/dashboard/components/SalesChart';
import OpsChart from '@/features/dashboard/components/OpsChart';
import MarketingChart from '@/features/dashboard/components/MarketingChart';
import PendingFollowups from '@/features/dashboard/components/PendingFollowups';
import DelayedOrders from '@/features/dashboard/components/DelayedOrders';
import RecentFeedback from '@/features/dashboard/components/RecentFeedback';
import { RefreshCw } from 'lucide-react';
import { useT } from '@/i18n/useT';

export default function DashboardPage() {
    const { data, loading, error, refetch } = useDashboard();
    const t = useT();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))]/30 border-t-[hsl(var(--primary))]" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-sm text-red-400">{error ?? t.dashboard.failedLoad}</p>
                <button onClick={refetch}
                    className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
                    <RefreshCw size={14} /> {t.dashboard.retry}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Row 1 - KPI Cards */}
            <KpiCards kpis={data.kpis} />

            {/* Row 2 - Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SalesChart data={data.charts.leadsByStatus} quotations={data.charts.ordersByQuotation} />
                <OpsChart data={data.charts.punctuality} />
                <MarketingChart campaigns={data.charts.campaigns} />
            </div>

            {/* Row 3 - Actionable Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <PendingFollowups data={data.lists.pendingFollowUps} />
                <DelayedOrders data={data.lists.delayedWorkOrders} />
                <RecentFeedback data={data.lists.recentFeedback} />
            </div>

        </div>
    );
}
