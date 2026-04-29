'use client';

import { DollarSign, Percent, UserCheck, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function MarketingPerformance() {
    const mockData = {
        budgetAllocated: 50000,
        budgetUsed: 35000,
        revenueAmount: 120000,
        leadsGenerated: 250,
        leadsConverted: 42,
        topCreator: "Ahmed Samir"
    };

    const budgetPct = Math.round((mockData.budgetUsed / mockData.budgetAllocated) * 100);
    const roasPct = Math.round(((mockData.revenueAmount - mockData.budgetUsed) / mockData.budgetUsed) * 100);
    const conversionRate = ((mockData.leadsConverted / mockData.leadsGenerated) * 100).toFixed(1);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Marketing Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Budget Overview */}
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Budget Overview</span>
                        <div className="rounded-xl p-2.5 bg-slate-500/10">
                            <DollarSign size={20} className="text-slate-400" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-bold tracking-tight">
                            EGP {new Intl.NumberFormat('en-EG').format(mockData.budgetUsed)}
                        </p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                            used of EGP {new Intl.NumberFormat('en-EG').format(mockData.budgetAllocated)}
                        </p>
                    </div>
                    <div className="space-y-2 mt-auto">
                        <div className="flex justify-between text-xs font-medium">
                            <span>{budgetPct}% spent</span>
                        </div>
                        <Progress value={budgetPct} className="h-2" />
                    </div>
                </div>

                {/* Revenue & ROAS */}
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Revenue & ROAS</span>
                        <div className="rounded-xl p-2.5 bg-emerald-500/10">
                            <BarChart3 size={20} className="text-emerald-400" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-bold tracking-tight text-emerald-500">
                            EGP {new Intl.NumberFormat('en-EG').format(mockData.revenueAmount)}
                        </p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                            Revenue Generated
                        </p>
                    </div>
                    <div className="mt-auto flex items-center gap-2 text-sm font-medium">
                        <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md">
                            +{roasPct}% ROAS
                        </span>
                    </div>
                </div>

                {/* Conversion Rate */}
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Conversion Rate</span>
                        <div className="rounded-xl p-2.5 bg-purple-500/10">
                            <Percent size={20} className="text-purple-400" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold tracking-tight">
                            {conversionRate}%
                        </p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                            {mockData.leadsConverted} of {mockData.leadsGenerated} leads
                        </p>
                    </div>
                </div>

                {/* Top Marketing Creator */}
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Top Creator</span>
                        <div className="rounded-xl p-2.5 bg-blue-500/10">
                            <UserCheck size={20} className="text-blue-400" />
                        </div>
                    </div>
                    <div className="mt-2 text-center flex-1 flex flex-col items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xl font-bold mb-3">
                            {mockData.topCreator.charAt(0)}
                        </div>
                        <p className="text-lg font-bold tracking-tight">
                            {mockData.topCreator}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                            Top Campaign Runner
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

