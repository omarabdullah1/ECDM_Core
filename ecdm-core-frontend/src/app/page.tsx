'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/useAuth';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser().then(() => {
      // will re-render with updated isAuthenticated
    });
  }, [loadUser]);

  useEffect(() => {
    if (isAuthenticated) {
      const role = user?.role;
      const adminRoles = ['Admin', 'SuperAdmin', 'Manager'];

      if (adminRoles.includes(role || '')) {
        router.replace('/dashboard');
      } else if (role === 'Sales') {
        router.replace('/sales/leads');
      } else if (role === 'Marketing') {
        router.replace('/marketing/leads');
      } else if (role === 'Operations' || role === 'Maintenance' || role === 'MaintenanceEngineer') {
        router.replace('/operations/work-order');
      } else if (role === 'HR') {
        router.replace('/hr/users');
      } else if (role === 'Finance') {
        router.replace('/finance/invoices');
      } else if (role === 'Customer Service' || role === 'CustomerService') {
        router.replace('/customer/list');
      } else {
        router.replace('/profile');
      }
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse-glow h-12 w-12 rounded-full bg-[hsl(var(--primary))]" />
    </div>
  );
}

