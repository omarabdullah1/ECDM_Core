'use client';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

const DATA = [
    { status: 'New', count: 45 },
    { status: 'Contacted', count: 32 },
    { status: 'Negotiation', count: 18 },
    { status: 'Won', count: 12 },
    { status: 'Lost', count: 8 },
];

export default function SalesChart() {
    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-5">
            <div>
                <h3 className="text-base font-semibold">Sales Pipeline</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Leads by current stage</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                    barCategoryGap="40%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false}
                        stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 10,
                            fontSize: 12,
                        }}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar dataKey="count" name="Leads" fill="hsl(var(--primary))"
                        radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
