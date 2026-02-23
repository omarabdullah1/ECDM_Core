'use client';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

// Generate 30 days of mock data
const DATA = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const label = `${date.getDate()}/${date.getMonth() + 1}`;
    const impressions = Math.floor(Math.random() * 4000) + 3000;
    const conversions = Math.floor(impressions * (Math.random() * 0.06 + 0.02));
    return { date: label, Impressions: impressions, Conversions: conversions };
});

// Show only every 5th label to avoid crowding
const tickEvery = 5;

export default function MarketingChart() {
    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-5">
            <div>
                <h3 className="text-base font-semibold">Marketing ROI</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Impressions vs Conversions – last 30 days
                </p>
            </div>

            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}
                        stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        interval={tickEvery - 1}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 10,
                            fontSize: 12,
                        }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        iconType="circle"
                        iconSize={8}
                    />
                    <Line type="monotone" dataKey="Impressions"
                        stroke="#60a5fa" strokeWidth={2} dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="Conversions"
                        stroke="#34d399" strokeWidth={2} dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
