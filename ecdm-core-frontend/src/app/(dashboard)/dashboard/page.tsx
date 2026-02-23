'use client';

import KpiCards from '@/features/dashboard/components/KpiCards';
import SalesChart from '@/features/dashboard/components/SalesChart';
import OpsChart from '@/features/dashboard/components/OpsChart';
import MarketingChart from '@/features/dashboard/components/MarketingChart';
import PendingFollowups from '@/features/dashboard/components/PendingFollowups';
import DelayedOrders from '@/features/dashboard/components/DelayedOrders';
import RecentFeedback from '@/features/dashboard/components/RecentFeedback';

export default function DashboardPage() {
    return (
        <div className="space-y-6">

            {/* Row 1 - KPI Cards */}
            <KpiCards />

            {/* Row 2 - Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SalesChart />
                <OpsChart />
                <MarketingChart />
            </div>

            {/* Row 3 - Actionable Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <PendingFollowups />
                <DelayedOrders />
                <RecentFeedback />
            </div>

        </div>
    );
}
