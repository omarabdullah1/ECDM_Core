'use client';

import { Target, Users, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function SalesPerformance() {
    const mockData = {
        targetSales: 1000000,
        actualSales: 750000,
        dealsClosed: 42,
        newClients: 15,
        customerFeedback: 4.8
    };

    const performancePct = Math.round((mockData.actualSales / mockData.targetSales) * 100);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Sales Target & Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Target vs Actual */}
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Target vs Actual Sales</span>
                        <div className="rounded-xl p-2.5 bg-blue-500/10">
                            <Target size={20} className="text-blue-400" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold tracking-tight">
                            EGP {new Intl.NumberFormat('en-EG').format(mockData.actualSales)}
                        </p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                            of EGP {new Intl.NumberFormat('en-EG').format(mockData.targetSales)}
                        </p>
                    </div>
                    <div className="space-y-2 mt-2">
                        <div className="flex justify-between text-xs font-medium">
                            <span>Performance</span>
                            <span>{performancePct}%</span>
                        </div>
                        <Progress value={performancePct} className="h-2" />
                    </div>
                </div>

                {/* Deals & Clients */}
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Deals & Clients</span>
                        <div className="rounded-xl p-2.5 bg-emerald-500/10">
                            <Users size={20} className="text-emerald-400" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">Deals Closed</p>
                            <p className="text-3xl font-bold tracking-tight">{mockData.dealsClosed}</p>
                        </div>
                        <div>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">New Clients</p>
                            <p className="text-3xl font-bold tracking-tight">{mockData.newClients}</p>
                        </div>
                    </div>
                </div>

                {/* Customer Feedback */}
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Customer Feedback</span>
                        <div className="rounded-xl p-2.5 bg-amber-500/10">
                            <Star size={20} className="text-amber-400" fill="currentColor" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-4xl font-bold tracking-tight">{mockData.customerFeedback}</p>
                        <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">/ 5.0 Average</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
