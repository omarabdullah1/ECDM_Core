'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { PunctualityData } from '../useDashboard';

interface Props { data: PunctualityData }

export default function OpsChart({ data }: Props) {
    const chartData = [
        { name: 'On-Time', value: data.onTimePct, color: '#22c55e' },
        { name: 'Delayed', value: data.latePct, color: '#ef4444' },
    ];

    const isEmpty = data.total === 0;

    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-5">
            <div>
                <h3 className="text-base font-semibold">Operations Punctuality</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    {isEmpty ? 'No completed work orders yet' : `${data.total} work orders tracked`}
                </p>
            </div>

            {isEmpty ? (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-12">No data yet</p>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                                paddingAngle={3} dataKey="value" strokeWidth={0}>
                                {chartData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, '']}
                                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6">
                        {chartData.map((d) => (
                            <div key={d.name} className="flex items-center gap-2 text-sm">
                                <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                                <span className="text-[hsl(var(--muted-foreground))]">{d.name}</span>
                                <span className="font-semibold">{d.value}%</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
