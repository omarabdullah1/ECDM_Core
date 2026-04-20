'use client';

import { Bell, Search } from 'lucide-react';
import LangSwitcher from '@/components/ui/LangSwitcher';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import { useT } from '@/i18n/useT';

export default function Header() {
    const t = useT();

    return (
        <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between border-b border-[hsl(var(--border))]/50 bg-[#f9fafb]/80 backdrop-blur-2xl px-6 transition-all">
            {/* Search */}
            <div className="relative w-72 group">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] group-focus-within:text-[hsl(var(--primary))] transition-colors" />
                <input type="text" placeholder={t.header.search}
                    className="w-full rounded-full border border-[hsl(var(--border))]/50 bg-[hsl(var(--secondary))]/40 py-1.5 ps-9 pe-4 text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]/40 focus:bg-[hsl(var(--background))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary))]/10 transition-all shadow-sm group-focus-within:premium-shadow"
                />
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
                <ThemeSwitcher variant="icon" />
                <LangSwitcher variant="icon" />

                <button className="relative rounded-full p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-all focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30">
                    <Bell size={16} />
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse" />
                </button>
            </div>
        </header>
    );
}
