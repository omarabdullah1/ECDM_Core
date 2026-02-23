'use client';
import type { FollowUpItem } from '../useDashboard';

interface Props { data: FollowUpItem[] }

function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 0) return `In ${Math.abs(diffDays)}d`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
}

export default function PendingFollowups({ data }: Props) {
    const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold">Pending Follow-ups</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Unsolved issues needing attention</p>
                </div>
                <span className="text-xs font-semibold bg-amber-500/15 text-amber-400 rounded-full px-2.5 py-0.5">
                    {data.length} pending
                </span>
            </div>

            {data.length === 0 ? (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-6">All caught up!</p>
            ) : (
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[280px]">
                    {data.map((f) => {
                        const overdue = isOverdue(f.followUpDate);
                        const customerName = f.customer?.name ?? 'Unknown';
                        const csrName = f.csr ? `${f.csr.firstName} ${f.csr.lastName}` : '—';
                        return (
                            <div key={f._id}
                                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors
                                    ${overdue ? 'bg-red-500/8 border border-red-500/20' : 'hover:bg-white/4'}`}>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{customerName}</p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                        {csrName} ·{' '}
                                        <span className={overdue ? 'text-red-400 font-semibold' : 'text-amber-400'}>
                                            {timeAgo(f.followUpDate)}
                                        </span>
                                    </p>
                                    {f.reasonForNotSolving && (
                                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]/70 mt-0.5 line-clamp-1">{f.reasonForNotSolving}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
