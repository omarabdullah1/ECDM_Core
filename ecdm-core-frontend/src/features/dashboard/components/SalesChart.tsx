'use client';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { LeadStatusItem, OrderStatusItem } from '../useDashboard';
import { useT } from '@/i18n/useT';

interface Props {
    data: LeadStatusItem[];
    quotations: OrderStatusItem[];
}

const STATUS_COLORS: Record<string, string> = {
    New: '#3b82f6',
    Contacted: '#8b5cf6',
    Qualified: '#f59e0b',
    Proposal: '#f97316',
    Won: '#22c55e',
    Lost: '#ef4444',
    Accepted: '#22c55e',
    Rejected: '#ef4444',
    Negotiation: '#f59e0b',
    Pending: '#6b7280',
    Expired: '#9ca3af',
};

export default function SalesChart({ data, quotations }: Props) {
    const t = useT();
    const d = t.dashboard;
    const hasLeads = data.length > 0;
    const chartData = hasLeads ? data : quotations.map(q => ({ status: q.status, count: q.count }));
    const title = hasLeads ? d.salesPipelineLeads : d.salesPipelineQuotations;

    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-5">
            <div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    {hasLeads ? d.leadsByStage : d.ordersByQuotation}
                </p>
            </div>
            {chartData.length === 0 ? (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-12">{d.noDataYet}</p>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="status" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }}
                            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        />
                        <Bar dataKey="count" name={d.count} radius={[6, 6, 0, 0]}>
                            {chartData.map((entry) => (
                                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? 'hsl(var(--primary))'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

