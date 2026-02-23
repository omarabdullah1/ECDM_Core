import { useLangStore } from '@/features/lang/useLang';
import en from './en';
import ar from './ar';

const translations = { en, ar } as const;

/** Returns the translation object for the currently selected language. */
export function useT() {
    const lang = useLangStore((s) => s.lang);
    return translations[lang];
}
