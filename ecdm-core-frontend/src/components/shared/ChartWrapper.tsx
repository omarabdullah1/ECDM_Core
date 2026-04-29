'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ChartWrapperProps {
    children: ReactNode;
    height?: string;
    className?: string;
}

export function ChartWrapper({ children, height = 'h-64', className }: ChartWrapperProps) {
    return (
        <div className={cn('w-full min-h-[200px]', height, className)}>
            {children}
        </div>
    );
}

export default ChartWrapper;

