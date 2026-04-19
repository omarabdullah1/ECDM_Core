import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 uppercase tracking-wider',
        {
          'border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow': variant === 'default',
          'border-transparent bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]': variant === 'secondary',
          'border-[hsl(var(--border))] text-[hsl(var(--foreground))]': variant === 'outline',
          'border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]': variant === 'destructive',
          'border-transparent bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]': variant === 'success',
          'border-transparent bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]': variant === 'warning',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
