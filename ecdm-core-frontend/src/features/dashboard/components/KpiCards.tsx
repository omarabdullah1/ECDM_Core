'use client';
import { Users, DollarSign, Wrench, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { DashboardKpis } from '../useDashboard';

interface Props { kpis: DashboardKpis }

function fmt(n: number) {
    return new Intl.NumberFormat('en-EG').format(n);
}

export default function KpiCards({ kpis }: Props) {
    const cards = [
        {
            label: 'Active Clients & Customers',
            value: fmt(kpis.activeClients + kpis.activeCustomers),
            trend: `${Number(kpis.clientGrowthPct) >= 0 ? '+' : ''}${kpis.clientGrowthPct}% this month`,
            trendUp: Number(kpis.clientGrowthPct) >= 0,
            icon: Users,
            accentClass: 'text-blue-400',
            bgClass: 'bg-blue-500/10',
            isStock: false,
        },
        {
            label: 'Revenue (Current Month)',
            value: `EGP ${fmt(kpis.revenueThisMonth)}`,
            trend: `${Number(kpis.revenueTrendPct) >= 0 ? '+' : ''}${kpis.revenueTrendPct}% vs last month`,
            trendUp: Number(kpis.revenueTrendPct) >= 0,
            icon: DollarSign,
            accentClass: 'text-emerald-400',
            bgClass: 'bg-emerald-500/10',
            isStock: false,
        },
        {
            label: 'Active Work Orders',
            value: fmt(kpis.activeWorkOrders),
            trend: 'In Progress',
            trendUp: false,
            icon: Wrench,
            accentClass: 'text-purple-400',
            bgClass: 'bg-purple-500/10',
            isStock: false,
        },
        {
            label: 'Low Stock Alerts',
            value: fmt(kpis.totalLowStock),
            trend: `${kpis.lowStockItems} Spare Parts · ${kpis.lowStockProducts} Products`,
            trendUp: false,
            icon: AlertTriangle,
            accentClass: 'text-red-400',
            bgClass: 'bg-red-500/10',
            isStock: true,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map((kpi) => {
                const Icon = kpi.icon;
                const Trend = kpi.trendUp ? TrendingUp : TrendingDown;
                const trendColor = kpi.isStock
                    ? 'text-red-400'
                    : kpi.trendUp ? 'text-emerald-400' : 'text-red-400';
                return (
                    <div key={kpi.label}
                        className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4 hover:border-[hsl(var(--primary))]/30 transition-colors">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{kpi.label}</span>
                            <div className={`rounded-xl p-2.5 ${kpi.bgClass}`}>
                                <Icon size={20} className={kpi.accentClass} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold tracking-tight">{kpi.value}</p>
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${trendColor}`}>
                            <Trend size={13} />
                            <span>{kpi.trend}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
