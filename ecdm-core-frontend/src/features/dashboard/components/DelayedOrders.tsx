'use client';
import { AlertTriangle } from 'lucide-react';
import type { DelayedOrderItem } from '../useDashboard';
import { useT } from '@/i18n/useT';

interface Props { data: DelayedOrderItem[] }

function lateBadgeColor(d?: number) {
    if (!d) return 'bg-orange-500/20 text-orange-400';
    if (d >= 7) return 'bg-red-500/20 text-red-400';
    if (d >= 4) return 'bg-orange-500/20 text-orange-400';
    return 'bg-amber-500/20 text-amber-400';
}

export default function DelayedOrders({ data }: Props) {
    const t = useT();
    const d = t.dashboard;

    function daysLateLabel(item: DelayedOrderItem) {
        if (item.lateDuration && item.lateDurationType) {
            const unit = item.lateDurationType === 'Hours' ? d.hoursAgo : d.daysAgo;
            return `${item.lateDuration}${unit.charAt(0)} ${d.late}`;
        }
        const days = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86400000);
        return `${days} ${d.daysAgo}`;
    }

    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <AlertTriangle size={16} className="text-orange-400" />
                        {d.delayedWorkOrders}
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 ms-6">{d.markedLateOpen}</p>
                </div>
                <span className="text-xs font-semibold bg-red-500/15 text-red-400 rounded-full px-2.5 py-0.5">
                    {data.length} {d.orders}
                </span>
            </div>

            {data.length === 0 ? (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-6">{d.noDelayedOrders}</p>
            ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[280px]">
                    {data.map((order) => {
                        const engName = order.assignedEngineer
                            ? `${d.eng} ${order.assignedEngineer?.firstName ?? ''} ${order.assignedEngineer?.lastName ?? ''}`
                            : '—';
                        return (
                            <div key={order._id}
                                className="flex items-start justify-between gap-3 rounded-xl border border-[hsl(var(--border))] px-4 py-3 hover:border-orange-500/30 transition-colors">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{order.typeOfOrder}</span>
                                    </div>
                                    <p className="text-sm font-medium mt-0.5 line-clamp-1">{order.issue}</p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                                        {order.customer?.name ?? d.unknown} · <span className="text-foreground/70">{engName}</span>
                                    </p>
                                    {order.reasonForDelay && (
                                        <p className="text-[10px] text-amber-400/80 mt-0.5 line-clamp-1">{d.reasonPrefix} {order.reasonForDelay}</p>
                                    )}
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${lateBadgeColor(order.lateDuration)}`}>
                                    {daysLateLabel(order)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

