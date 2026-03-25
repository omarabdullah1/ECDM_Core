'use client';

import { cn } from '@/lib/utils';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    className?: string;
    showHeader?: boolean;
    showPagination?: boolean;
}

export function TableSkeleton({
    rows = 5,
    columns = 4,
    className,
    showHeader = true,
    showPagination = true,
}: TableSkeletonProps) {
    return (
        <div className={cn('space-y-4', className)}>
            {showHeader && (
                <div className="flex items-center gap-4">
                    <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
                    <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
                </div>
            )}
            
            <div className="rounded-md border border-border">
                <table className="w-full">
                    {showHeader && (
                        <thead className="border-b border-border bg-muted/50">
                            <tr>
                                {Array.from({ length: columns }).map((_, i) => (
                                    <th key={i} className="h-10 px-4 text-left">
                                        <div className="h-4 w-20 animate-pulse rounded bg-muted-foreground/20" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {Array.from({ length: rows }).map((_, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-border last:border-0">
                                {Array.from({ length: columns }).map((_, colIndex) => (
                                    <td key={colIndex} className="p-4">
                                        <div className="h-4 animate-pulse rounded bg-muted-foreground/20" style={{ width: `${60 + Math.random() * 40}%` }} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {showPagination && (
                <div className="flex items-center justify-between">
                    <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                    <div className="flex gap-2">
                        <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
                        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                        <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
                    </div>
                </div>
            )}
        </div>
    );
}

export function CardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn('rounded-lg border border-border p-6', className)}>
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted-foreground/20" />
                    <div className="h-8 w-32 animate-pulse rounded bg-muted-foreground/20" />
                </div>
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted-foreground/20" />
            </div>
        </div>
    );
}

export function DetailSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/20" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-muted-foreground/20" />
                </div>
            ))}
        </div>
    );
}

export default TableSkeleton;
