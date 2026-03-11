"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Briefcase, DollarSign, Target, Award, Loader2, ShieldAlert, TrendingUp, FileText } from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const TOOLTIP_STYLE = {
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    fontSize: '12px',
};

function KpiCard({ label, value, icon: Icon, color }: {
    label: string;
    value: number | string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
}) {
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{label}</p>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}><Icon size={20} /></div>
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{value}</span>
            </div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">{title}</h3>
            <div className="h-64">{children}</div>
        </div>
    );
}

export default function SalesInsights() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuthStore();
    const [pageLoading, setPageLoading] = useState(true);
    
    const [salesData, setSalesData] = useState({
        winRate: 0,
        avgDealSize: 0,
        dealsWon: 0,
        totalRevenue: 0,
        pipelineValue: 0,
        activeDeals: 0,
        topPerformers: [] as any[],
        pipelineStatus: [] as any[]
    });

    const isAllowed =
        user?.role === 'Sales' || user?.role === 'Admin' || user?.role === 'SuperAdmin';

    useEffect(() => {
        if (authLoading) return;
        if (!isAllowed) { router.push('/dashboard'); return; }

        async function loadSalesInsights() {
            try {
                // EXACT Main Dashboard API calls using api.get()
                const [usersRes, ordersRes] = await Promise.all([
                    api.get('/auth/users?limit=1000').catch(() => ({ data: [] })),
                    api.get('/sales/orders?limit=1000').catch(() => ({ data: [] }))
                ]);

                // EXACT Main Dashboard extraction helper
                const extract = (res: any): any[] => {
                    if (!res || !res.data) return [];
                    const data = res.data;
                    if (Array.isArray(data)) return data;
                    if (Array.isArray(data.data?.data)) return data.data.data;
                    if (Array.isArray(data.data)) return data.data;
                    if (Array.isArray(data.users)) return data.users;
                    if (Array.isArray(data.orders)) return data.orders;
                    return [];
                };

                const users = extract(usersRes);
                const orders = extract(ordersRes);

                // EXACT Main Dashboard parseMoney function
                const parseMoney = (val: any): number => {
                    if (val === null || val === undefined || val === '') return 0;
                    if (typeof val === 'number') return val;
                    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
                    const parsed = parseFloat(cleaned);
                    return isNaN(parsed) ? 0 : parsed;
                };

                // EXACT Main Dashboard sales users filter
                const salesUsers = users.filter((u: any) => String(u?.role || '').toLowerCase().trim() === 'sales');

                // EXACT Main Dashboard calculation logic
                let totalSalesActual = 0;
                let totalDealsClosed = 0;
                const performerRevenue: Record<string, number> = {};

                salesUsers.forEach((u: any) => {
                    const uId = String(u._id || u.id);
                    const userName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Unknown';
                    
                    // A. Find orders where salesPerson field matches this user (exact backend field name)
                    const userOrders = orders.filter((o: any) => {
                        const spId = String(o?.salesPerson?._id || o?.salesPerson || o?.salespersonId?._id || o?.salespersonId || '');
                        return spId === uId;
                    });

                    // B. Filter using EXACT backend conditions
                    const wonOrders = userOrders.filter((o: any) => {
                        const firstFollowUp = String(o?.quotationStatusFirstFollowUp || '').toLowerCase();
                        const secondFollowUp = String(o?.statusSecondFollowUp || '').toLowerCase();
                        const thirdFollowUp = String(o?.finalStatusThirdFollowUp || '').toLowerCase();
                        
                        return firstFollowUp === 'accepted' || 
                               secondFollowUp === 'scheduled' || 
                               thirdFollowUp === 'accepted';
                    });

                    totalDealsClosed += wonOrders.length;

                    // C. Sum using EXACT backend field: quotation.grandTotal
                    const userActual = wonOrders.reduce((sum, o) => {
                        const grandTotal = o?.quotation?.grandTotal || 0;
                        return sum + parseMoney(grandTotal);
                    }, 0);

                    totalSalesActual += userActual;
                    if (userActual > 0) {
                        performerRevenue[userName] = userActual;
                    }
                });

                // Calculate Insights (MUST match Dashboard's totalSalesActual)
                const totalOrders = orders.length;
                const dealsWonCount = totalDealsClosed;
                const winRateCalc = totalOrders > 0 ? (dealsWonCount / totalOrders) * 100 : 0;
                const avgDealCalc = dealsWonCount > 0 ? totalSalesActual / dealsWonCount : 0;

                // Additional Metrics: Pipeline Value and Active Deals
                const pipelineValueCalc = orders.reduce((sum, o) => {
                    const status = String(o?.finalStatus || o?.quotationStatus || o?.status || '').toLowerCase();
                    if (status.includes('cancel') || status.includes('reject')) return sum;
                    
                    const val = o?.quotation?.grandTotal || o?.price || o?.totalAmount || 
                                o?.cost || o?.amount || o?.value || o?.grandTotal || 0;
                    return sum + parseMoney(val);
                }, 0);

                const activeDealsCount = orders.filter((o: any) => {
                    const status = String(o?.finalStatus || o?.quotationStatus || o?.status || '').toLowerCase();
                    return !status.includes('cancel') && !status.includes('reject') && 
                           !status.includes('complete') && !status.includes('closed');
                }).length;

                // Chart 1: Pipeline Status (all orders)
                const statusCounts = orders.reduce((acc: any, o: any) => {
                    const status = o?.finalStatus || o?.status || 'Pending';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {});
                const pipelineChartData = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }));

                // Chart 2: Top Performers (by Revenue from won orders)
                const performerChartData = Object.keys(performerRevenue)
                    .map(key => ({ name: key, Revenue: performerRevenue[key] }))
                    .sort((a, b) => b.Revenue - a.Revenue)
                    .slice(0, 8);

                setSalesData({
                    winRate: winRateCalc,
                    avgDealSize: avgDealCalc,
                    dealsWon: dealsWonCount,
                    totalRevenue: totalSalesActual,
                    pipelineValue: pipelineValueCalc,
                    activeDeals: activeDealsCount,
                    topPerformers: performerChartData,
                    pipelineStatus: pipelineChartData
                });

            } catch (error) { 
                console.error('Sales insights fetch error:', error); 
            } finally {
                setPageLoading(false);
            }
        }
        loadSalesInsights();
    }, [authLoading, isAllowed, router]);

    if (authLoading || pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isAllowed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-slate-50 dark:bg-slate-950 text-red-500">
                <ShieldAlert size={48} />
                <h2 className="text-2xl font-bold">Access Denied</h2>
                <p className="text-slate-500 dark:text-slate-400">You do not have permission to view sales insights.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans transition-colors duration-200">
            {/* Header */}
            <div className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-xl">
                        <Briefcase size={22} />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Sales Insights
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm ms-[52px]">
                    Deep dive into revenue, win rates, and team performance.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                <KpiCard
                    label="Win Rate"
                    value={`${salesData.winRate.toFixed(1)}%`}
                    icon={Target}
                    color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                />
                <KpiCard
                    label="Average Deal Size"
                    value={`EGP ${salesData.avgDealSize.toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                />
                <KpiCard
                    label="Deals Won"
                    value={salesData.dealsWon}
                    icon={Award}
                    color="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                />
                <KpiCard
                    label="Total Revenue"
                    value={`EGP ${salesData.totalRevenue.toLocaleString()}`}
                    icon={TrendingUp}
                    color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                />
                <KpiCard
                    label="Pipeline Value"
                    value={`EGP ${salesData.pipelineValue.toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                />
                <KpiCard
                    label="Active Deals"
                    value={salesData.activeDeals}
                    icon={FileText}
                    color="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard title="Top Performers (Closed Deals)">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesData.topPerformers} layout="vertical" margin={{ left: 8, right: 16 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                                stroke="rgba(150,150,150,0.1)"
                            />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="rgba(150,150,150,0.5)"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                width={90}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(150,150,150,0.05)' }}
                                contentStyle={TOOLTIP_STYLE}
                            />
                            <Bar dataKey="Revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Pipeline Status Breakdown">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={salesData.pipelineStatus}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={4}
                                dataKey="value"
                            >
                                {salesData.pipelineStatus.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
}
