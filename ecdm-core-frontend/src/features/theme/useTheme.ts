'use client';
import { create } from 'zustand';
import { useEffect } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeState {
    theme: Theme;
    _hydrated: boolean;
    setTheme: (t: Theme) => void;
    toggleTheme: () => void;
    _hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: 'dark',          // SSR-safe default (matches server render)
    _hydrated: false,
    setTheme: (theme) => {
        if (typeof window !== 'undefined') localStorage.setItem('ecdm_theme', theme);
        set({ theme });
    },
    toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        if (typeof window !== 'undefined') localStorage.setItem('ecdm_theme', next);
        set({ theme: next });
    },
    _hydrate: () => {
        if (typeof window === 'undefined') return;
        const saved = localStorage.getItem('ecdm_theme') as Theme | null;
        if (saved && (saved === 'light' || saved === 'dark')) {
            set({ theme: saved, _hydrated: true });
        } else {
            set({ _hydrated: true });
        }
    },
}));

/** Call once in ThemeProvider to sync store with localStorage after mount */
export function useThemeHydrate() {
    const hydrate = useThemeStore((s) => s._hydrate);
    const hydrated = useThemeStore((s) => s._hydrated);
    useEffect(() => {
        if (!hydrated) hydrate();
    }, [hydrate, hydrated]);
}
