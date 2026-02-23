'use client';

interface Feedback {
    id: number;
    customer: string;
    rating: number;
    note: string;
    date: string;
}

const DATA: Feedback[] = [
    { id: 1, customer: 'Ramses Engineering Co.', rating: 5, note: 'Excellent service, the team was very professional and completed ahead of schedule.', date: '2 hours ago' },
    { id: 2, customer: 'Al-Nour Contracting', rating: 4, note: 'Good quality work overall. Minor delay on day 3 but resolved quickly.', date: 'Yesterday' },
    { id: 3, customer: 'Delta Steel LLC', rating: 2, note: 'The technician arrived late. Equipment still making noise after repair.', date: 'Yesterday' },
    { id: 4, customer: 'Cairo Infra Group', rating: 5, note: 'Very satisfied. Will definitely use ECDM again for future projects.', date: '2 days ago' },
    { id: 5, customer: 'South Valley Tech', rating: 1, note: 'Terrible experience. No communication and the issue was not fixed.', date: '3 days ago' },
];

function Stars({ rating }: { rating: number }) {
    return (
        <span className="flex gap-0.5" aria-label={`${rating} out of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
                <span key={i}
                    className={`text-sm ${i < rating ? 'text-amber-400' : 'text-[hsl(var(--muted-foreground))]/40'}`}>
                    ★
                </span>
            ))}
        </span>
    );
}

function ratingRowClass(rating: number) {
    if (rating <= 2) return 'border-red-500/25 bg-red-500/5';
    return 'border-[hsl(var(--border))]';
}

export default function RecentFeedback() {
    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col gap-4">
            <div>
                <h3 className="text-base font-semibold">Recent Feedback</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Latest customer ratings</p>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[310px] pe-1">
                {DATA.map((fb) => (
                    <div key={fb.id}
                        className={`rounded-xl border px-4 py-3 flex flex-col gap-1.5 ${ratingRowClass(fb.rating)}`}>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{fb.customer}</span>
                            <Stars rating={fb.rating} />
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 leading-relaxed">
                            {fb.note}
                        </p>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]/60">{fb.date}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
