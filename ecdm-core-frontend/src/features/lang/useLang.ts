'use client';
import { create } from 'zustand';

export type Lang = 'en' | 'ar';

interface LangState {
    lang: Lang;
    setLang: (l: Lang) => void;
}

const saved =
    typeof window !== 'undefined'
        ? (localStorage.getItem('ecdm_lang') as Lang | null)
        : null;

export const useLangStore = create<LangState>((set) => ({
    lang: saved ?? 'en',
    setLang: (lang) => {
        if (typeof window !== 'undefined') localStorage.setItem('ecdm_lang', lang);
        set({ lang });
    },
}));
