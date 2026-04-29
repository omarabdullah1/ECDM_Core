'use client';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/features/theme/useTheme';
import { useT } from '@/i18n/useT';

interface Props {
    className?: string;
    variant?: 'icon' | 'full';
}

export default function ThemeSwitcher({ className = '', variant = 'full' }: Props) {
    const { theme, toggleTheme } = useThemeStore();
    const t = useT();
    const label = theme === 'dark' ? t.theme.light : t.theme.dark;
    const Icon = theme === 'dark' ? Sun : Moon;

    return (
        <button
            onClick={toggleTheme}
            title={label}
            className={[
                'flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))]',
                'px-3 py-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))]',
                'hover:border-[hsl(var(--primary))]/60 hover:text-[hsl(var(--primary))]',
                'hover:bg-[hsl(var(--primary))]/5 transition-all',
                className,
            ].join(' ')}
        >
            <Icon size={14} />
            {variant === 'full' && <span>{label}</span>}
        </button>
    );
}

