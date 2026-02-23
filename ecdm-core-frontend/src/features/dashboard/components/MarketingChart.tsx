'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CampaignItem } from '../useDashboard';

interface Props { campaigns: CampaignItem[] }

export default function MarketingChart({ campaigns }: Props) {
    const chartData = campaigns.map((c) => ({
        name: c.name.length > 18 ? c.name.slice(0, 16) + '…' : c.name,
        Impressions: c.impressions,
        Conversions: c.conversions,
    }));

    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-5">
            <div>
                <h3 className="text-base font-semibold">Marketing Campaigns</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Impressions vs Conversions — current campaigns
                </p>
            </div>

            {chartData.length === 0 ? (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-12">No active campaigns</p>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                        <Line type="monotone" dataKey="Impressions" stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                        <Line type="monotone" dataKey="Conversions" stroke="#34d399" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
