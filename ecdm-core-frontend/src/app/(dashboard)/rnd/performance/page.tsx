'use client';

import { TrendingUpDown, Target, CheckCircle2, Clock } from 'lucide-react';

export default function MyPerformancePage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
                        <TrendingUpDown size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">My Performance</h1>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            Track your R&D contributions and metrics
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                            <Target size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">Tasks Assigned</p>
                            <p className="text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                            <CheckCircle2 size={20} className="text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">Tasks Completed</p>
                            <p className="text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                            <Clock size={20} className="text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">In Progress</p>
                            <p className="text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Chart Placeholder */}
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                <h2 className="text-lg font-semibold mb-4">Performance Over Time</h2>
                <div className="flex items-center justify-center h-64 border border-dashed border-[hsl(var(--border))] rounded-lg">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Performance charts will be displayed here
                    </p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        No recent activity to display
                    </p>
                </div>
            </div>
        </div>
    );
}
