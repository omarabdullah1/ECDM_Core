'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, isLoading, loadUser } = useAuthStore();

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

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ms-[var(--sidebar-width)]">
                <Header />
                <main className="p-6 animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
