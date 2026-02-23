'use client';

import { useAuthStore } from '@/features/auth/useAuth';
import { LogOut, Bell, Search } from 'lucide-react';
import LangSwitcher from '@/components/ui/LangSwitcher';
import { useT } from '@/i18n/useT';

export default function Header() {
    const { user, logout } = useAuthStore();
    const t = useT();

    return (
        <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-xl px-6">
            {/* Search */}
            <div className="relative w-80">
                <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input type="text" placeholder={t.header.search}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2 ps-10 pe-4 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all"
                />
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3">
                <LangSwitcher variant="icon" />

                <button className="relative rounded-xl p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all">
                    <Bell size={18} />
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                </button>

                <div className="h-6 w-px bg-[hsl(var(--border))]" />

                {/* User */}
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{user?.role}</p>
                    </div>
                </div>

                <button onClick={logout}
                    className="rounded-xl p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all"
                    title={t.header.signOut}>
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}
