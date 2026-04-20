'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

const COLLAPSED_KEY = 'ecdm_sidebar_collapsed';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, isLoading, loadUser } = useAuthStore();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Restore collapse preference from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(COLLAPSED_KEY);
        if (stored === 'true') setIsCollapsed(true);
    }, []);

    const handleToggle = () => {
        setIsCollapsed(prev => {
            localStorage.setItem(COLLAPSED_KEY, String(!prev));
            return !prev;
        });
    };

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-pulse-glow h-12 w-12 rounded-full bg-[hsl(var(--primary))]" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    /* Dynamic sidebar offset: collapsed=56px, expanded=220px */
    const sidebarMs = isCollapsed ? 'ms-[var(--sidebar-collapsed-width)]' : 'ms-[var(--sidebar-width)]';

    return (
        <div className="flex h-screen bg-[#f9fafb] text-[#111111] overflow-hidden">
            <Sidebar isCollapsed={isCollapsed} onToggle={handleToggle} />
            <div className={`flex flex-1 flex-col transition-all duration-300 ease-in-out min-w-0 ${sidebarMs}`}>
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in-slide font-sans custom-scrollbar">
                    <div className="max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
