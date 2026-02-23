'use client';
import type { FeedbackItem } from '../useDashboard';
import { useT } from '@/i18n/useT';

interface Props { data: FeedbackItem[] }

function Stars({ rating }: { rating: number }) {
    return (
        <span className="flex gap-0.5" aria-label={`${rating} out of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`text-sm ${i < rating ? 'text-amber-400' : 'text-[hsl(var(--muted-foreground))]/40'}`}>★</span>
            ))}
        </span>
    );
}

function ratingRowClass(rating: number) {
    if (rating <= 2) return 'border-red-500/25 bg-red-500/5';
    return 'border-[hsl(var(--border))]';
}

export default function RecentFeedback({ data }: Props) {
    const t = useT();
    const d = t.dashboard;

    function timeAgo(dateStr: string) {
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const h = Math.floor(diffMs / 3600000);
        if (h < 1) return d.justNow;
        if (h < 24) return `${h}${d.hoursAgo}`;
        const days = Math.floor(h / 24);
        if (days === 1) return d.yesterday;
        return `${days} ${d.daysAgo}`;
    }

    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
            <div>
                <h3 className="text-base font-semibold">{d.recentFeedback}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{d.latestRatings}</p>
            </div>

            {data.length === 0 ? (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-6">{d.noFeedbackYet}</p>
            ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[310px] pe-1">
                    {data.map((fb) => {
                        const avgRating = Math.round((fb.ratingOperation + fb.ratingCustomerService) / 2);
                        return (
                            <div key={fb._id} className={`rounded-xl border px-4 py-3 flex flex-col gap-1.5 ${ratingRowClass(avgRating)}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium truncate">{fb.customer?.name ?? d.unknown}</span>
                                    <Stars rating={avgRating} />
                                </div>
                                <div className="flex gap-3 text-[10px] text-[hsl(var(--muted-foreground))]">
                                    <span>{d.op}: {fb.ratingOperation}/5</span>
                                    <span>{d.cs}: {fb.ratingCustomerService}/5</span>
                                    {fb.engineer && <span>{d.eng} {fb.engineer.firstName} {fb.engineer.lastName}</span>}
                                </div>
                                {fb.notes && (
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 leading-relaxed">{fb.notes}</p>
                                )}
                                <span className="text-[10px] text-[hsl(var(--muted-foreground))]/60">{timeAgo(fb.createdAt)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
