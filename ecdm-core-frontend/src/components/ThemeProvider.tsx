'use client';
import { useEffect } from 'react';
import { useThemeStore, useThemeHydrate } from '@/features/theme/useTheme';

/**
 * Reads the current theme from the Zustand store and applies
 * the matching class (`dark` or nothing) to <html>.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    useThemeHydrate();
    const theme = useThemeStore((s) => s.theme);

    useEffect(() => {
        const html = document.documentElement;
        if (theme === 'dark') {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
    }, [theme]);

    return <>{children}</>;
}

