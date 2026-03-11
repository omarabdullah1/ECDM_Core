'use client';

import { Bell, Search } from 'lucide-react';
import LangSwitcher from '@/components/ui/LangSwitcher';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import { useT } from '@/i18n/useT';

export default function Header() {
    const t = useT();

    return (
        <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-xl px-4">
            {/* Search */}
            <div className="relative w-56">
                <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input type="text" placeholder={t.header.search}
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-1 ps-8 pe-3 text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all"
                />
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
                <ThemeSwitcher variant="icon" />
                <LangSwitcher variant="icon" />

                <button className="relative rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-all">
                    <Bell size={15} />
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                </button>
            </div>
        </header>
    );
}
