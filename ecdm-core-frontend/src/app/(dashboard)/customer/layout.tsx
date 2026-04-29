'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/useAuth';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isLoading } = useAuthStore();

    useEffect(() => {
        if (!isLoading && user) {
            const forbiddenRoles = ['Marketing', 'Operations', 'Maintenance', 'MaintenanceEngineer', 'Technician'];
            
            if (forbiddenRoles.includes(user.role || '')) {
                router.replace('/dashboard');
            } else if (user?.role === 'Sales' && pathname === '/customer/list') {
                router.replace('/sales/my-customers');
            }
        }
    }, [user, isLoading, router, pathname]);

    const isRestricted = !isLoading && user && (
        ['Marketing', 'Operations', 'Maintenance', 'MaintenanceEngineer', 'Technician'].includes(user.role || '') || 
        (user?.role === 'Sales' && pathname === '/customer/list')
    );

    if (isLoading || isRestricted) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-pulse-glow h-10 w-10 rounded-full bg-[hsl(var(--primary))]" />
            </div>
        );
    }

    return <>{children}</>;
}

