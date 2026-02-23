'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface FollowUp {
    id: number;
    customer: string;
    csr: string;
    dueDate: string;
    overdue: boolean;
}

const INITIAL: FollowUp[] = [
    { id: 1, customer: 'Ramses Engineering Co.', csr: 'Sara M.', dueDate: 'Today, 10:00 AM', overdue: false },
    { id: 2, customer: 'Al-Nour Contracting', csr: 'Mohamed K.', dueDate: 'Today, 11:30 AM', overdue: false },
    { id: 3, customer: 'Delta Steel LLC', csr: 'Nour H.', dueDate: 'Yesterday', overdue: true },
    { id: 4, customer: 'Cairo Infra Group', csr: 'Omar A.', dueDate: '2 days ago', overdue: true },
    { id: 5, customer: 'South Valley Tech', csr: 'Sara M.', dueDate: 'Today, 2:00 PM', overdue: false },
];

export default function PendingFollowups() {
    const [items, setItems] = useState<FollowUp[]>(INITIAL);

    const markDone = (id: number) => setItems((prev) => prev.filter((f) => f.id !== id));

    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold">Pending Follow-ups</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Due today or overdue</p>
                </div>
                <span className="text-xs font-semibold bg-amber-500/15 text-amber-400 rounded-full px-2.5 py-0.5">
                    {items.length} pending
                </span>
            </div>

            {items.length === 0 ? (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-6">All caught up! 🎉</p>
            ) : (
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[280px]">
                    {items.map((f) => (
                        <div key={f.id}
                            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors
                                ${f.overdue ? 'bg-red-500/8 border border-red-500/20' : 'hover:bg-white/4'}`}>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{f.customer}</p>
                                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                    {f.csr} ·{' '}
                                    <span className={f.overdue ? 'text-red-400 font-semibold' : 'text-amber-400'}>
                                        {f.dueDate}
                                    </span>
                                </p>
                            </div>
                            <button onClick={() => markDone(f.id)}
                                className="shrink-0 rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/15 transition-colors"
                                title="Mark as done">
                                <CheckCircle2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
