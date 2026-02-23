'use client';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

const DATA = [
    { name: 'On-Time', value: 73, color: '#22c55e' },
    { name: 'Delayed', value: 27, color: '#ef4444' },
];

export default function OpsChart() {
    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-5">
            <div>
                <h3 className="text-base font-semibold">Operations Punctuality</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">On-time vs delayed completion</p>
            </div>

            <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                    <Pie
                        data={DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                    >
                        {DATA.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => [`${value}%`, '']}
                        contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 10,
                            fontSize: 12,
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex justify-center gap-6">
                {DATA.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                        <span className="text-[hsl(var(--muted-foreground))]">{d.name}</span>
                        <span className="font-semibold">{d.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
