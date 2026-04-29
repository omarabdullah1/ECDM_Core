'use client';

import React from 'react';
import { Target, CheckCircle2, Zap, Award } from 'lucide-react';

interface PerformanceStats {
    totalTasks: number;
    completed: number;
    punctualityRate: number;
}

interface PerformanceScoreCardProps {
    stats: PerformanceStats | null;
    loading?: boolean;
}

export default function PerformanceScoreCard({ stats, loading }: PerformanceScoreCardProps) {
    if (loading) {
        return (
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-6 animate-pulse">
                <div className="h-4 w-32 bg-[hsl(var(--muted))] rounded" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-3 w-16 bg-[hsl(var(--muted))] rounded" />
                            <div className="h-8 w-12 bg-[hsl(var(--muted))] rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const { totalTasks = 0, completed = 0, punctualityRate = 0 } = stats || {};

    return (
        <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm transition-all hover:shadow-md group">
            {/* Background Decoration */}
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[hsl(var(--primary))]/5 blur-3xl transition-all group-hover:bg-[hsl(var(--primary))]/10" />
            
            <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                            <Award size={18} />
                        </div>
                        <h3 className="text-sm font-bold tracking-tight uppercase text-[hsl(var(--muted-foreground))]">
                            Total Performance Score
                        </h3>
                    </div>
                    {totalTasks > 0 && (
                        <span className="text-[10px] font-bold text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-2 py-0.5 rounded-full">
                            Live Stats
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">
                            <Target size={12} className="text-blue-500" />
                            Total Tasks
                        </div>
                        <p className="text-2xl font-black tabular-nums">{totalTasks}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">
                            <CheckCircle2 size={12} className="text-green-500" />
                            Completed
                        </div>
                        <p className="text-2xl font-black tabular-nums text-green-600 dark:text-green-400">{completed}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">
                            <Zap size={12} className="text-amber-500" />
                            Punctuality
                        </div>
                        <p className="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">
                            {punctualityRate}%
                        </p>
                    </div>
                </div>

                {/* Progress Bar for Completion */}
                {totalTasks > 0 && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">
                            <span>Efficiency Rate</span>
                            <span>{Math.round((completed / totalTasks) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]/30">
                            <div 
                                className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-blue-500 transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(100, Math.round((completed / totalTasks) * 100))}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

