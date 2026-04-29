'use client';
import { Globe } from 'lucide-react';
import { useLangStore } from '@/features/lang/useLang';

interface Props {
    /** Extra Tailwind classes (e.g. positioning). */
    className?: string;
    /** 'icon' = globe only, 'full' = globe + label (default) */
    variant?: 'icon' | 'full';
}

export default function LangSwitcher({ className = '', variant = 'full' }: Props) {
    const { lang, setLang } = useLangStore();
    const next    = lang === 'en' ? 'ar' : 'en';
    const label   = lang === 'en' ? 'العربية' : 'English';

    return (
        <button
            onClick={() => setLang(next)}
            title={label}
            className={[
                'flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))]',
                'px-3 py-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))]',
                'hover:border-[hsl(var(--primary))]/60 hover:text-[hsl(var(--primary))]',
                'hover:bg-[hsl(var(--primary))]/5 transition-all',
                className,
            ].join(' ')}
        >
            <Globe size={14} />
            {variant === 'full' && <span>{label}</span>}
        </button>
    );
}

