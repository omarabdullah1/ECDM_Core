'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* ─── Context ─────────────────────────────────────────────────── */
interface CtxType {
    open: boolean;
    setOpen: (v: boolean) => void;
}

const Ctx = React.createContext<CtxType>({ open: false, setOpen: () => { } });

/* ─── Root ────────────────────────────────────────────────────── */
export function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    React.useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <Ctx.Provider value={{ open, setOpen }}>
            <div ref={ref} className="relative">
                {children}
            </div>
        </Ctx.Provider>
    );
}

/* ─── Trigger ─────────────────────────────────────────────────── */
interface TriggerProps {
    asChild?: boolean;
    children: React.ReactElement | React.ReactNode;
}

export function DropdownMenuTrigger({ asChild, children }: TriggerProps) {
    const { open, setOpen } = React.useContext(Ctx);
    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!open);
    };
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
            onClick: toggle,
        });
    }
    return <button onClick={toggle}>{children}</button>;
}

/* ─── Content ─────────────────────────────────────────────────── */
interface ContentProps {
    children: React.ReactNode;
    className?: string;
    side?: 'right' | 'left' | 'top' | 'bottom';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
}

export function DropdownMenuContent({
    children, className, side = 'bottom', align = 'start',
}: ContentProps) {
    const { open, setOpen } = React.useContext(Ctx);
    if (!open) return null;

    const posClass =
        side === 'right' ? 'left-full top-auto bottom-0 ms-1' :
            side === 'left' ? 'right-full top-auto bottom-0 me-1' :
                side === 'top' ? 'bottom-full mb-1' :
                    'top-full mt-1';

    const alignClass =
        align === 'end' ? 'right-0' :
            align === 'center' ? 'left-1/2 -translate-x-1/2' :
                'left-0';

    return (
        <div
            onClick={() => setOpen(false)}
            className={cn(
                'absolute z-50 min-w-[10rem] overflow-hidden rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--card))] p-1 text-[hsl(var(--foreground))] shadow-sm animate-fade-in',
                posClass, alignClass, className,
            )}
        >
            {children}
        </div>
    );
}

/* ─── Item ────────────────────────────────────────────────────── */
interface ItemProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}

export function DropdownMenuItem({ children, className, onClick, disabled }: ItemProps) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'flex h-8 w-full select-none items-center gap-2 rounded-sm px-2 text-xs outline-none transition-colors hover:bg-[hsl(var(--secondary))]/80 focus:bg-[hsl(var(--secondary))]/80 disabled:opacity-50 disabled:cursor-not-allowed text-left',
                className,
            )}
        >
            {children}
        </button>
    );
}

/* ─── Separator ───────────────────────────────────────────────── */
export function DropdownMenuSeparator({ className }: { className?: string }) {
    return <div className={cn('-mx-1 my-1 h-px bg-[hsl(var(--border))]/50', className)} />;
}

/* ─── Label ───────────────────────────────────────────────────── */
export function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={cn('px-2 py-1.5 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide', className)}>
            {children}
        </p>
    );
}

