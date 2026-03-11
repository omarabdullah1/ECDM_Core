'use client';
import { Users, DollarSign, Wrench, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { DashboardKpis } from '../useDashboard';
import { useT } from '@/i18n/useT';

interface Props { kpis: DashboardKpis }

function fmt(n: number) {
    return new Intl.NumberFormat('en-EG').format(n);
}

export default function KpiCards({ kpis }: Props) {
    const t = useT();
    const d = t.dashboard;

    const cards = [
        {
            label: d.activeClientsCustomers,
            value: fmt(kpis.activeClients + kpis.activeCustomers),
            trend: `${Number(kpis.clientGrowthPct) >= 0 ? '+' : ''}${kpis.clientGrowthPct}% ${d.thisMonth}`,
            trendUp: Number(kpis.clientGrowthPct) >= 0,
            icon: Users,
            accentClass: 'text-blue-400',
            bgClass: 'bg-blue-500/10',
            isStock: false,
        },
        {
            label: d.activeWorkOrders,
            value: fmt(kpis.activeWorkOrders),
            trend: d.inProgress,
            trendUp: false,
            icon: Wrench,
            accentClass: 'text-purple-400',
            bgClass: 'bg-purple-500/10',
            isStock: false,
        },
        {
            label: d.lowStockAlerts,
            value: fmt(kpis.totalLowStock),
            trend: `${kpis.lowStockItems} ${d.sparePartsLabel} · ${kpis.lowStockProducts} ${d.productsLabel}`,
            trendUp: false,
            icon: AlertTriangle,
            accentClass: 'text-red-400',
            bgClass: 'bg-red-500/10',
            isStock: true,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 h-full">
            {cards.map((kpi) => {
                const Icon = kpi.icon;
                const Trend = kpi.trendUp ? TrendingUp : TrendingDown;
                const trendColor = kpi.isStock
                    ? 'text-red-400'
                    : kpi.trendUp ? 'text-emerald-400' : 'text-red-400';
                return (
                    <div key={kpi.label}
                        className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4 hover:border-[hsl(var(--primary))]/30 transition-colors h-full justify-between">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{kpi.label}</span>
                                <div className={`rounded-xl p-2.5 ${kpi.bgClass}`}>
                                    <Icon size={20} className={kpi.accentClass} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold tracking-tight mt-4">{kpi.value}</p>
                        </div>
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
