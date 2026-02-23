'use client';
import { create } from 'zustand';
import { useEffect } from 'react';

export type Lang = 'en' | 'ar';

interface LangState {
    lang: Lang;
    _hydrated: boolean;
    setLang: (l: Lang) => void;
    _hydrate: () => void;
}

export const useLangStore = create<LangState>((set) => ({
    lang: 'en',           // SSR-safe default
    _hydrated: false,
    setLang: (lang) => {
        if (typeof window !== 'undefined') localStorage.setItem('ecdm_lang', lang);
        set({ lang });
    },
    _hydrate: () => {
        if (typeof window === 'undefined') return;
        const saved = localStorage.getItem('ecdm_lang') as Lang | null;
        if (saved && saved !== 'en') set({ lang: saved, _hydrated: true });
        else set({ _hydrated: true });
    },
}));

/** Call this once in LangProvider to sync store with localStorage after mount */
export function useLangHydrate() {
    const hydrate = useLangStore((s) => s._hydrate);
    const hydrated = useLangStore((s) => s._hydrated);
    useEffect(() => {
        if (!hydrated) hydrate();
    }, [hydrate, hydrated]);
}
