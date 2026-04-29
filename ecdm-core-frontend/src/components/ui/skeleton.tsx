interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    height?: string;
}

export function TableSkeleton({ rows = 10, columns = 8, height = 'h-12' }: TableSkeletonProps) {
    return (
        <div className="space-y-3 p-4">
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div
                            key={colIndex}
                            className={`${height} bg-[hsl(var(--muted))]/50 animate-pulse rounded-lg flex-1`}
                            style={{
                                animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-4 ${className}`}>
            <div className="h-6 w-1/3 bg-[hsl(var(--muted))]/50 animate-pulse rounded" />
            <div className="space-y-2">
                <div className="h-4 w-full bg-[hsl(var(--muted))]/50 animate-pulse rounded" />
                <div className="h-4 w-2/3 bg-[hsl(var(--muted))]/50 animate-pulse rounded" />
            </div>
        </div>
    );
}

export function FormSkeleton() {
    return (
        <div className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="h-4 w-24 bg-[hsl(var(--muted))]/50 animate-pulse rounded" />
                    <div className="h-12 bg-[hsl(var(--muted))]/50 animate-pulse rounded-xl" />
                </div>
                <div className="space-y-2">
                    <div className="h-4 w-24 bg-[hsl(var(--muted))]/50 animate-pulse rounded" />
                    <div className="h-12 bg-[hsl(var(--muted))]/50 animate-pulse rounded-xl" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-4 w-32 bg-[hsl(var(--muted))]/50 animate-pulse rounded" />
                <div className="h-24 bg-[hsl(var(--muted))]/50 animate-pulse rounded-xl" />
            </div>
        </div>
    );
}

