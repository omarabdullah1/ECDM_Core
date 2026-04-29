'use client';
import { useEffect } from 'react';
import { useLangStore, useLangHydrate } from '@/features/lang/useLang';

/**
 * Reads the current language from the Zustand store and applies
 * the matching `dir` + `lang` attributes to <html> so CSS RTL rules
 * and screen-readers work correctly.
 */
export default function LangProvider({ children }: { children: React.ReactNode }) {
    useLangHydrate();            // sync store with localStorage after first mount
    const lang = useLangStore((s) => s.lang);

    useEffect(() => {
        const html = document.documentElement;
        html.lang = lang;
        html.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    }, [lang]);

    return <>{children}</>;
}

