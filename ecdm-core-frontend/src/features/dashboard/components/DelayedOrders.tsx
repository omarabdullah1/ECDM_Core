'use client';
import { AlertTriangle } from 'lucide-react';

interface DelayedOrder {
    id: string;
    type: string;
    customer: string;
    engineer: string;
    daysLate: number;
}

const DATA: DelayedOrder[] = [
    { id: 'WO-0041', type: 'HVAC Maintenance', customer: 'Ramses Engineering Co.', engineer: 'Khaled S.', daysLate: 4 },
    { id: 'WO-0038', type: 'Electrical Wiring', customer: 'Delta Steel LLC', engineer: 'Hassan M.', daysLate: 7 },
    { id: 'WO-0035', type: 'Plumbing Repair', customer: 'Al-Nour Contracting', engineer: 'Amir Y.', daysLate: 2 },
    { id: 'WO-0029', type: 'Civil Inspection', customer: 'Cairo Infra Group', engineer: 'Omar R.', daysLate: 11 },
];

function lateBadgeColor(days: number) {
    if (days >= 7) return 'bg-red-500/20 text-red-400';
    if (days >= 4) return 'bg-orange-500/20 text-orange-400';
    return 'bg-amber-500/20 text-amber-400';
}

export default function DelayedOrders() {
    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <AlertTriangle size={16} className="text-orange-400" />
                        Delayed Work Orders
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 ms-6">Past scheduled deadline</p>
                </div>
                <span className="text-xs font-semibold bg-red-500/15 text-red-400 rounded-full px-2.5 py-0.5">
                    {DATA.length} orders
                </span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[280px]">
                {DATA.map((order) => (
                    <div key={order.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-[hsl(var(--border))] px-4 py-3 hover:border-orange-500/30 transition-colors">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-semibold text-[hsl(var(--muted-foreground))]">
                                    {order.id}
                                </span>
                                <span className="text-sm font-medium truncate">{order.type}</span>
                            </div>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                                {order.customer} · <span className="text-foreground/70">Eng. {order.engineer}</span>
                            </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${lateBadgeColor(order.daysLate)}`}>
                            {order.daysLate}d late
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
