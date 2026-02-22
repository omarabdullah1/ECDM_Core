'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import {
    Users, CheckSquare, Building2, Target,
    ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
    totalClients: number;
    totalTasks: number;
    openTasks: number;
    doneTasks: number;
}

interface RecentClient {
    _id: string;
    companyName: string;
    status: string;
    createdAt: string;
}

interface RecentTask {
    _id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
}

const STATUS_COLORS: Record<string, string> = {
    Active: 'bg-emerald-500/15 text-emerald-400',
    Inactive: 'bg-gray-500/15 text-gray-400',
    Prospect: 'bg-blue-500/15 text-blue-400',
    Churned: 'bg-red-500/15 text-red-400',
    'To-do': 'bg-gray-500/15 text-gray-400',
    'In Progress': 'bg-amber-500/15 text-amber-400',
    'Done': 'bg-emerald-500/15 text-emerald-400',
};

const PRIORITY_COLORS: Record<string, string> = {
    Low: 'text-blue-400',
    Medium: 'text-amber-400',
    High: 'text-orange-400',
    Urgent: 'text-red-400',
};

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats>({ totalClients: 0, totalTasks: 0, openTasks: 0, doneTasks: 0 });
    const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
    const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [clientsRes, tasksRes] = await Promise.all([
                    api.get('/crm/clients', { params: { limit: 5 } }),
                    api.get('/erp/tasks', { params: { limit: 5 } }),
                ]);

                const clientData = clientsRes.data.data;
                const taskData = tasksRes.data.data;

                setRecentClients(clientData.data || []);
                setRecentTasks(taskData.data || []);

                const allTasksRes = await api.get('/erp/tasks', { params: { limit: 1 } });
                const totalTasks = allTasksRes.data.data.pagination.total;

                const openTasksRes = await api.get('/erp/tasks', { params: { limit: 1, status: 'To-do' } });
                const inProgressRes = await api.get('/erp/tasks', { params: { limit: 1, status: 'In Progress' } });
                const doneTasksRes = await api.get('/erp/tasks', { params: { limit: 1, status: 'Done' } });

                setStats({
                    totalClients: clientData.pagination.total,
                    totalTasks,
                    openTasks: openTasksRes.data.data.pagination.total + inProgressRes.data.data.pagination.total,
                    doneTasks: doneTasksRes.data.data.pagination.total,
                });
            } catch { /* ignore */ }
            setLoading(false);
        };
        fetchDashboard();
    }, []);

    const statCards = [
        { label: 'Total Clients', value: stats.totalClients, icon: Building2, color: 'from-blue-500 to-blue-600', href: '/dashboard/crm/clients' },
        { label: 'Active Leads', value: 0, icon: Target, color: 'from-purple-500 to-purple-600', href: '/dashboard/crm/leads' },
        { label: 'Open Tasks', value: stats.openTasks, icon: CheckSquare, color: 'from-emerald-500 to-emerald-600', href: '/dashboard/erp/tasks' },
        { label: 'Team Members', value: 1, icon: Users, color: 'from-amber-500 to-amber-600', href: '#' },
    ];

    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))]" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Greeting */}
            <div>
                <h1 className="text-2xl font-bold">
                    Welcome back, <span className="gradient-text">{user?.firstName}</span> 👋
                </h1>
                <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                    Here&apos;s what&apos;s happening with your business today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link key={stat.label} href={stat.href}
                            className="glass-card p-5 hover:border-[hsl(var(--primary))]/30 transition-all group cursor-pointer">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{stat.label}</p>
                                    <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                                </div>
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                                    <Icon size={20} />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs text-[hsl(var(--primary))] opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowUpRight size={14} /> View details
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Recent Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Clients */}
                <div className="glass-card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
                        <h3 className="font-semibold flex items-center gap-2"><Building2 size={16} className="text-blue-400" /> Recent Clients</h3>
                        <Link href="/dashboard/crm/clients" className="text-xs text-[hsl(var(--primary))] hover:underline">View all →</Link>
                    </div>
                    {recentClients.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                            No clients yet. <Link href="/dashboard/crm/clients" className="text-[hsl(var(--primary))] hover:underline">Add one</Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-[hsl(var(--border))]/50">
                            {recentClients.map((c) => (
                                <div key={c._id} className="flex items-center justify-between px-5 py-3 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium">{c.companyName}</p>
                                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatDate(c.createdAt)}</p>
                                    </div>
                                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[c.status])}>
                                        {c.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Tasks */}
                <div className="glass-card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
                        <h3 className="font-semibold flex items-center gap-2"><CheckSquare size={16} className="text-emerald-400" /> Recent Tasks</h3>
                        <Link href="/dashboard/erp/tasks" className="text-xs text-[hsl(var(--primary))] hover:underline">View all →</Link>
                    </div>
                    {recentTasks.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                            No tasks yet. <Link href="/dashboard/erp/tasks" className="text-[hsl(var(--primary))] hover:underline">Create one</Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-[hsl(var(--border))]/50">
                            {recentTasks.map((t) => (
                                <div key={t._id} className="flex items-center justify-between px-5 py-3 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium">{t.title}</p>
                                        <p className={cn('text-xs font-medium', PRIORITY_COLORS[t.priority])}>{t.priority}</p>
                                    </div>
                                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[t.status])}>
                                        {t.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Bar */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-3">Task Completion</h3>
                <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                            style={{ width: stats.totalTasks > 0 ? `${(stats.doneTasks / stats.totalTasks) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                        {stats.doneTasks}/{stats.totalTasks} done
                    </span>
                </div>
            </div>
        </div>
    );
}
