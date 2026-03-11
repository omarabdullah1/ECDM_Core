"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { TrendingUp, Target, Users, Loader2, DollarSign, ShieldAlert, Wallet, BarChart3 } from 'lucide-react';
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

export default function MarketingInsights() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuthStore();
    const [pageLoading, setPageLoading] = useState(true);
    
    const [marketingData, setMarketingData] = useState({
        totalLeads: 0,
        conversionRate: 0,
        cpl: 0,
        totalBudget: 0,
        revenueGenerated: 0,
        roas: 0,
        totalAdSpend: 0,
        averageCPA: 0,
        roiPercentage: 0,
        campaignEfficiency: 'N/A' as string,
        leadSources: [] as any[],
        monthlyTrend: [] as any[],
        sourceConversions: [] as any[],
        campaignPerformance: [] as any[],
        regionDistribution: [] as any[]
    });

    const isAllowed =
        user?.role === 'Marketing' || user?.role === 'Admin' || user?.role === 'SuperAdmin';

    useEffect(() => {
        if (authLoading) return;
        if (!isAllowed) { router.push('/dashboard'); return; }

        async function loadMarketingInsights() {
            try {
                // UNIVERSAL EXTRACTOR - Handles all possible API response nesting patterns (EXACT Dashboard match)
                const universalExtract = (rawData: any): any[] => {
                    if (!rawData) return [];
                    if (Array.isArray(rawData)) return rawData;
                    
                    // Handle nested structures: { success: true, data: { campaigns: [], users: [], etc } }
                    if (rawData.data?.campaigns && Array.isArray(rawData.data.campaigns)) return rawData.data.campaigns;
                    if (rawData.data?.users && Array.isArray(rawData.data.users)) return rawData.data.users;
                    if (rawData.data?.orders && Array.isArray(rawData.data.orders)) return rawData.data.orders;
                    if (rawData.data?.leads && Array.isArray(rawData.data.leads)) return rawData.data.leads;
                    if (rawData.data?.workOrders && Array.isArray(rawData.data.workOrders)) return rawData.data.workOrders;
                    
                    // Handle { success: true, data: { data: [] } }
                    if (rawData.data?.data && Array.isArray(rawData.data.data)) return rawData.data.data;
                    
                    // Handle { data: [] }
                    if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
                    
                    // Handle top-level keys
                    if (rawData.campaigns && Array.isArray(rawData.campaigns)) return rawData.campaigns;
                    if (rawData.users && Array.isArray(rawData.users)) return rawData.users;
                    if (rawData.orders && Array.isArray(rawData.orders)) return rawData.orders;
                    if (rawData.leads && Array.isArray(rawData.leads)) return rawData.leads;
                    if (rawData.workOrders && Array.isArray(rawData.workOrders)) return rawData.workOrders;
                    
                    // Fallback: search for any key that holds an array
                    const potentialArray = Object.values(rawData).find(val => Array.isArray(val));
                    return (potentialArray as any[]) || [];
                };

                // Fetch using axios with configured baseURL
                const [usersRes, leadsRes, campaignsRes, ordersRes] = await Promise.all([
                    api.get('/auth/users?limit=1000')
                        .then(r => { console.log('✅ Users API Success:', r.status); return r.data; })
                        .catch(err => { console.error('❌ Users API Failed:', err.response?.status, err.message); return { data: [] }; }),
                    api.get('/sales/leads?limit=1000')
                        .then(r => { console.log('✅ Leads API Success:', r.status); return r.data; })
                        .catch(err => { console.error('❌ Leads API Failed:', err.response?.status, err.message); return { data: [] }; }),
                    api.get('/marketing/campaigns?limit=1000')
                        .then(r => { console.log('✅ Campaigns API Success:', r.status); return r.data; })
                        .catch(err => { console.error('❌ Campaigns API Failed:', err.response?.status, err.message); return { data: [] }; }),
                    api.get('/sales/orders?limit=1000')
                        .then(r => { console.log('✅ Orders API Success:', r.status); return r.data; })
                        .catch(err => { console.error('❌ Orders API Failed:', err.response?.status, err.message); return { data: [] }; })
                ]);

                const users = universalExtract(usersRes);
                const leads = universalExtract(leadsRes);
                const campaigns = universalExtract(campaignsRes);
                const orders = universalExtract(ordersRes);

                // 🔥 FORCE DEBUG LOGS - Pipeline Diagnostic
                console.log("DEBUG: Total Campaigns Found:", campaigns.length);
                if (campaigns.length > 0) {
                    console.log("DEBUG: First Campaign Object Keys:", Object.keys(campaigns[0]));
                    console.log("DEBUG: First 3 Campaigns Revenue Check:", campaigns.slice(0, 3).map(c => ({
                        name: c.campaignName || c.name,
                        salesRevenue: c.salesRevenue,
                        adSpend: c.adSpend
                    })));
                }
                console.log("DEBUG: Raw campaignsRes structure:", campaignsRes);

                // DEBUG: Log fetched data counts
                console.log('📊 Marketing Insights - Data Fetched:', {
                    users: users.length,
                    leads: leads.length,
                    campaigns: campaigns.length,
                    orders: orders.length
                });

                // DEBUG: Log sample campaign to verify field names
                if (campaigns.length > 0) {
                    console.log('🔍 Sample Campaign (Insights):', campaigns[0]);
                    console.table(campaigns.slice(0, 2));
                }

                // EXACT Main Dashboard parseMoney function
                const parseMoney = (val: any): number => {
                    if (val === null || val === undefined || val === '') return 0;
                    if (typeof val === 'number') return val;
                    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
                    const parsed = parseFloat(cleaned);
                    return isNaN(parsed) ? 0 : parsed;
                };

                // EXACT Main Dashboard marketing users filter
                const marketingUsers = users.filter((u: any) => String(u?.role || '').toLowerCase().trim() === 'marketing');

                // Total Allocated Budget = sum of budgets assigned to Marketing role users by Admin
                const totalAllocatedBudget = marketingUsers.reduce((sum, u) => {
                    const budget = u.targetBudget || u.targetMarketingBudget || u.budget || 0;
                    return sum + (Number(String(budget).replace(/[^0-9.-]+/g, "")) || 0);
                }, 0);

                // Metrics Calculation (EXACT Main Dashboard logic)
                const totalLeadsCount = leads.length;
                
                // EXACT Main Dashboard conversion logic
                const convertedLeads = leads.filter((l: any) => 
                    l?.order === 'Yes' || String(l?.status || '').toLowerCase().includes('converted')
                );
                const conversionCalc = totalLeadsCount > 0 ? (convertedLeads.length / totalLeadsCount) * 100 : 0;

                // CPL (Cost Per Lead) using Admin-allocated budget
                const cplCalc = totalLeadsCount > 0 ? totalAllocatedBudget / totalLeadsCount : 0;

                // Additional Metrics: Revenue Generated and ROAS
                // Use EXACT Dashboard campaign-level aggregation for revenue & spend
                const totalAdSpendCalc = campaigns.reduce((sum: number, c: any) => {
                    const val = c.adSpend || c.spend || c.ad_spend || c.budget || 0;
                    const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;
                    return sum + parsed;
                }, 0);
                
                const totalSalesRevenueCalc = campaigns.reduce((sum: number, c: any) => {
                    const val = c.salesRevenue || c.revenue || c.sales_revenue || c.totalAmount || c.total_revenue || 0;
                    const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;
                    return sum + parsed;
                }, 0);

                // Ad Spend = sum from campaigns; fallback to allocated budget
                const finalTotalAdSpend = totalAdSpendCalc > 0 ? totalAdSpendCalc : totalAllocatedBudget;
                const finalRevenueGenerated = totalSalesRevenueCalc > 0 ? totalSalesRevenueCalc : 0;
                const finalROAS = (finalTotalAdSpend > 0 && finalRevenueGenerated > 0) 
                    ? (finalRevenueGenerated / finalTotalAdSpend) 
                    : 0;

                // Average CPA (Cost Per Acquisition/Conversion)
                const totalCampaignConversions = campaigns.reduce((sum: number, c: any) => {
                    return sum + (Number(c.conversions || c.Conversions || 0));
                }, 0);
                const totalConversionsForCPA = totalCampaignConversions > 0 ? totalCampaignConversions : convertedLeads.length;
                const averageCPACalc = totalConversionsForCPA > 0 ? (finalTotalAdSpend / totalConversionsForCPA) : 0;

                console.log('📈 Marketing Insights - Final Metrics:', {
                    finalTotalAdSpend,
                    finalRevenueGenerated,
                    finalROAS: finalROAS > 0 ? finalROAS.toFixed(2) + 'x' : '0.00x',
                    averageCPA: averageCPACalc.toFixed(2),
                    totalConversionsForCPA
                });

                // Chart 1: Lead Sources Distribution
                const leadSources = leads.reduce((acc: any, lead: any) => {
                    const type = lead.type || lead.source || 'Unknown';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {});
                const sourcesChartData = Object.keys(leadSources).map(key => ({ name: key, value: leadSources[key] }));

                // Chart 2: Conversion by Source
                const sourceConvChartData = Object.keys(leadSources).map((source) => {
                    const fromSource = leads.filter((l: any) => (l?.type || l?.source || 'Unknown') === source);
                    const converted = fromSource.filter((l: any) => 
                        l?.order === 'Yes' || String(l?.status || '').toLowerCase().includes('converted')
                    ).length;
                    return { name: source, Total: fromSource.length, Converted: converted };
                });

                // Chart 3: Monthly Trend
                const monthlyLeads = leads.reduce<Record<string, number>>((acc: any, lead: any) => {
                    const month = lead.createdAt
                        ? new Date(lead.createdAt as string).toLocaleString('default', { month: 'short', year: '2-digit' })
                        : 'N/A';
                    acc[month] = (acc[month] || 0) + 1;
                    return acc;
                }, {});
                const trendData = Object.entries(monthlyLeads).map(([month, Leads]) => ({ month, Leads }));

                // NEW Chart 4: Campaign Performance (Ad Spend vs Sales Revenue) - use campaignName field
                const campaignPerfData = campaigns
                    .map((c: any) => ({
                        name: (c.campaignName || c.campaign || c.name || c.title || 'Unknown').substring(0, 20) + ((c.campaignName || c.campaign || c.name || c.title || '').length > 20 ? '...' : ''),
                        AdSpend: parseMoney(c.adSpend || c.spend || 0),
                        Revenue: parseMoney(c.salesRevenue || c.revenue || 0)
                    }))
                    .sort((a, b) => b.Revenue - a.Revenue)
                    .slice(0, 8);

                // NEW Chart 5: Region Distribution (Based on Region data in campaigns)
                const regionData = campaigns.reduce((acc: any, c: any) => {
                    // Check for region fields (adjust based on your actual schema)
                    const region1 = Number(c.region1) || 0;
                    const region2 = Number(c.region2) || 0;
                    const region3 = Number(c.region3) || 0;
                    
                    acc['Region 1'] = (acc['Region 1'] || 0) + region1;
                    acc['Region 2'] = (acc['Region 2'] || 0) + region2;
                    acc['Region 3'] = (acc['Region 3'] || 0) + region3;
                    return acc;
                }, {});
                
                const regionChartData = Object.entries(regionData)
                    .filter(([_, value]) => (value as number) > 0) // Only include regions with data
                    .map(([name, value]) => ({ name, value }));

                // Calculate ROI Percentage: ((Revenue - Spend) / Spend) * 100
                const roiPercentageCalc = finalTotalAdSpend > 0 
                    ? ((finalRevenueGenerated - finalTotalAdSpend) / finalTotalAdSpend) * 100 
                    : 0;

                // Determine Campaign Efficiency based on ROAS
                let efficiencyLabel = 'N/A';
                if (finalROAS >= 5) efficiencyLabel = 'Excellent';
                else if (finalROAS >= 3) efficiencyLabel = 'High';
                else if (finalROAS >= 2) efficiencyLabel = 'Good';
                else if (finalROAS >= 1) efficiencyLabel = 'Moderate';
                else if (finalROAS > 0) efficiencyLabel = 'Low';

                setMarketingData({
                    totalLeads: totalLeadsCount,
                    conversionRate: conversionCalc,
                    cpl: cplCalc,
                    totalBudget: totalAllocatedBudget,
                    revenueGenerated: finalRevenueGenerated,
                    roas: finalROAS,
                    totalAdSpend: finalTotalAdSpend,
                    averageCPA: averageCPACalc,
                    roiPercentage: roiPercentageCalc,
                    campaignEfficiency: efficiencyLabel,
                    leadSources: sourcesChartData,
                    monthlyTrend: trendData,
                    sourceConversions: sourceConvChartData,
                    campaignPerformance: campaignPerfData,
                    regionDistribution: regionChartData
                });

            } catch (error) { 
                console.error('Marketing insights fetch error:', error); 
            } finally {
                setPageLoading(false);
            }
        }
        loadMarketingInsights();
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
                <p className="text-slate-500 dark:text-slate-400">You do not have permission to view marketing insights.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans transition-colors duration-200">
            {/* Header */}
            <div className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-xl">
                        <TrendingUp size={22} />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Marketing Insights
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm ms-[52px]">
                    Deep dive into campaign performance and lead generation.
                </p>
            </div>

            {/* KPI Cards - Now 10 cards with ROI and Campaign Efficiency */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
                <KpiCard
                    label="Total Leads"
                    value={marketingData.totalLeads}
                    icon={Users}
                    color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                />
                <KpiCard
                    label="Conversion Rate"
                    value={`${marketingData.conversionRate.toFixed(1)}%`}
                    icon={Target}
                    color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                />
                <KpiCard
                    label="Est. Cost Per Lead (CPL)"
                    value={`EGP ${marketingData.cpl.toFixed(2)}`}
                    icon={DollarSign}
                    color="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                />
                <KpiCard
                    label="Total Ad Spend"
                    value={`EGP ${marketingData.totalAdSpend.toLocaleString()}`}
                    icon={Wallet}
                    color="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                />
                <KpiCard
                    label="Revenue Generated"
                    value={`EGP ${marketingData.revenueGenerated.toLocaleString()}`}
                    icon={TrendingUp}
                    color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                />
                <KpiCard
                    label="Overall ROAS"
                    value={marketingData.roas > 0 ? `${marketingData.roas.toFixed(2)}x` : '0.00x'}
                    icon={BarChart3}
                    color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                />
                <KpiCard
                    label="Average CPA"
                    value={`EGP ${marketingData.averageCPA.toFixed(2)}`}
                    icon={DollarSign}
                    color="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                />
                <KpiCard
                    label="ROI Percentage"
                    value={`${marketingData.roiPercentage.toFixed(1)}%`}
                    icon={TrendingUp}
                    color="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                />
                <KpiCard
                    label="Campaign Efficiency"
                    value={marketingData.campaignEfficiency}
                    icon={Target}
                    color="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                />
                <KpiCard
                    label="Total Marketing Budget"
                    value={`EGP ${marketingData.totalBudget.toLocaleString()}`}
                    icon={Wallet}
                    color="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard title="Lead Sources Distribution">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={marketingData.leadSources}
                                cx="50%"
                                cy="50%"
                                outerRadius={85}
                                dataKey="value"
                                paddingAngle={3}
                            >
                                {marketingData.leadSources.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Monthly Lead Trend">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={marketingData.monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />
                            <XAxis dataKey="month" stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Line type="monotone" dataKey="Leads" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Conversion by Source">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={marketingData.sourceConversions} margin={{ right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                            <XAxis dataKey="name" stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(150,150,150,0.05)' }} contentStyle={TOOLTIP_STYLE} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="Total" fill="#64748b" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="Converted" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Campaign Performance: Ad Spend vs Sales Revenue">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={marketingData.campaignPerformance} margin={{ right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                            <XAxis dataKey="name" stroke="rgba(150,150,150,0.5)" fontSize={10} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={70} />
                            <YAxis stroke="rgba(150,150,150,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(150,150,150,0.05)' }} contentStyle={TOOLTIP_STYLE} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="AdSpend" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={18} name="Ad Spend" />
                            <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} name="Sales Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {marketingData.regionDistribution.length > 0 && (
                    <ChartCard title="Regional Performance Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={marketingData.regionDistribution}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={85}
                                    dataKey="value"
                                    paddingAngle={3}
                                    label
                                >
                                    {marketingData.regionDistribution.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}
            </div>
        </div>
    );
}
