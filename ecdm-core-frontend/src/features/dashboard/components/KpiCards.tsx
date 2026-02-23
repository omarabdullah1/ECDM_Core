'use client';
import { Users, DollarSign, Wrench, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface KPI {
    label: string;
    value: string;
    trend: string;
    trendUp: boolean;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    accentClass: string;
    bgClass: string;
}

const MOCK_KPIS: KPI[] = [
    {
        label: 'Active CRM Clients',
        value: '248',
        trend: '+12% this month',
        trendUp: true,
        icon: Users,
        accentClass: 'text-blue-400',
        bgClass: 'bg-blue-500/10',
    },
    {
        label: 'Revenue (Current Month)',
        value: 'EGP 1,240,500',
        trend: '+8.4% vs last month',
        trendUp: true,
        icon: DollarSign,
        accentClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/10',
    },
    {
        label: 'Active Work Orders',
        value: '37',
        trend: '-3 since yesterday',
        trendUp: false,
        icon: Wrench,
        accentClass: 'text-purple-400',
        bgClass: 'bg-purple-500/10',
    },
    {
        label: 'Low Stock Alerts',
        value: '14',
        trend: '5 Sold Out · 9 Critical',
        trendUp: false,
        icon: AlertTriangle,
        accentClass: 'text-red-400',
        bgClass: 'bg-red-500/10',
    },
];

export default function KpiCards() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {MOCK_KPIS.map((kpi) => {
                const Icon = kpi.icon;
                const Trend = kpi.trendUp ? TrendingUp : TrendingDown;
                const trendColor = kpi.label === 'Low Stock Alerts'
                    ? 'text-red-400'
                    : kpi.trendUp ? 'text-emerald-400' : 'text-red-400';
                return (
                    <div key={kpi.label}
                        className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4 hover:border-[hsl(var(--primary))]/30 transition-colors">
                        {/* Icon + Label */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{kpi.label}</span>
                            <div className={`rounded-xl p-2.5 ${kpi.bgClass}`}>
                                <Icon size={20} className={kpi.accentClass} />
                            </div>
                        </div>
                        {/* Value */}
                        <p className="text-3xl font-bold tracking-tight">{kpi.value}</p>
                        {/* Trend */}
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
