"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart, Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
  Banknote, TrendingUp, TrendingDown, Users, Wrench, Package,
  AlertTriangle, Clock, ChevronRight, RefreshCw, Star,
  Target, ArrowUpRight, ArrowDownRight, Activity, BarChart2, CheckCircle2, XCircle,
  MessageSquare, Calendar, Loader2,
} from 'lucide-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/features/auth/useAuth';

// ── Types ──────────────────────────────────────────────────────────────────
interface DashboardStats {
  kpis: {
    activeClients: number;
    activeCustomers: number;
    clientGrowthPct: string;
    revenueThisMonth: number;
    revenueTrendPct: string;
    activeWorkOrders: number;
    lowStockProducts: number;
    lowStockItems: number;
    totalLowStock: number;
  };
  charts: {
    leadsByStatus: { status: string; count: number }[];
    ordersByQuotation: { status: string; count: number }[];
    punctuality: { onTime: number; late: number; total: number; onTimePct: number; latePct: number };
    campaigns: { name: string; platform: string; impressions: number; conversions: number; salesRevenue: number }[];
  };
  lists: {
    pendingFollowUps: any[];
    delayedWorkOrders: any[];
    recentFeedback: any[];
  };
}

interface DashboardSummary {
  financialMetrics: {
    realRevenueThisMonth: number;
    projectedRevenueThisMonth: number;
    totalInventoryValue: number;
  };
  lowStockAlerts: { count: number; items: { name: string; sku: string; stock: number; threshold: number }[] };
  pendingFollowUpsCount: number;
  activeWorkOrdersCount: number;
  totalCompanySalesTarget: number;
  totalCompanyMarketingBudget: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

const fmtCurrency = (n: number) => {
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `EGP ${(n / 1_000).toFixed(1)}K`;
  return `EGP ${n.toLocaleString()}`;
};

const CHART_COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)',
  'hsl(340, 82%, 52%)', 'hsl(262, 80%, 60%)', 'hsl(200, 85%, 50%)',
];

const STATUS_COLORS: Record<string, string> = {
  'New': 'hsl(221,83%,53%)', 'Contacted': 'hsl(200,85%,50%)',
  'Qualified': 'hsl(142,71%,45%)', 'Proposal Sent': 'hsl(38,92%,50%)',
  'Won': 'hsl(142,71%,45%)', 'Lost': 'hsl(0,72%,51%)',
  'Pending': 'hsl(38,92%,50%)', 'Approved': 'hsl(142,71%,45%)',
  'Rejected': 'hsl(0,72%,51%)', 'Draft': 'hsl(220,13%,60%)',
  'Sent': 'hsl(221,83%,53%)', 'On-Time': 'hsl(142,71%,45%)', 'Late': 'hsl(0,72%,51%)',
};

// ── Subcomponents ──────────────────────────────────────────────────────────
function KpiCard({
  title, value, sub, subPositive, icon: Icon, iconColor, loading
}: {
  title: string; value: string; sub?: string; subPositive?: boolean;
  icon: any; iconColor: string; loading?: boolean;
}) {
  return (
    <Card className="modern-glass-card border-none premium-shadow relative overflow-hidden m-auto w-full">
      <div className={`absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-10 blur-2xl ${iconColor}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${iconColor} bg-opacity-10`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {loading ? (
          <div className="h-8 w-24 rounded-md bg-[hsl(var(--muted))]/50 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">{value}</div>
        )}
        {sub && !loading && (
          <div className={`flex items-center text-xs mt-1.5 font-medium ${subPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {subPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3 flex items-center gap-2">
      <span className="inline-block w-3 h-0.5 rounded bg-[hsl(var(--primary))]" />
      {children}
    </h2>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function MainDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, summaryRes] = await Promise.all([
        api.get('/dashboard/stats').catch(e => { console.error('Stats error:', e); return null; }),
        api.get('/dashboard/summary').catch(e => { console.error('Summary error:', e); return null; }),
      ]);
      if (statsRes?.data?.data) setStats(statsRes.data.data);
      if (summaryRes?.data?.data) setSummary(summaryRes.data.data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const kpis = stats?.kpis;
  const charts = stats?.charts;
  const lists = stats?.lists;
  const fin = summary?.financialMetrics;

  // Build punctuality pie data — enum uses 'Same time' not 'On-Time'
  const punctualityPie = charts?.punctuality
    ? [
        { name: 'On-Time', value: charts.punctuality.onTime, fill: 'hsl(142,71%,45%)' },
        { name: 'Late', value: charts.punctuality.late, fill: 'hsl(0,72%,51%)' },
      ].filter(d => d.value > 0)
    : [];

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName: string = user?.firstName || 'there';


  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in">

      {/* ── Hero Banner ───────────────────────────────────────────── */}
      <div className="animate-in-slide stagger-1">
        <div className="rounded-3xl bg-[#111111] text-white p-8 relative overflow-hidden premium-shadow flex flex-col justify-between" style={{ minHeight: '220px' }}>
          {/* Subtle Background Pattern/Glow */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 h-full">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider backdrop-blur-md border border-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                System Integrity Verified
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                {greeting}, {String(firstName)}
              </h1>
              <p className="text-[#a1a1aa] text-sm md:text-base leading-relaxed max-w-lg">
                System Integrity through Automation. Your enterprise analytics and operations are running smoothly with complete synchronization across all modules.
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-3 Shrink-0">
              <span className="text-xs font-medium text-[#a1a1aa] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                Last sync: {lastRefreshed.toLocaleTimeString()}
              </span>
              <button
                onClick={fetchAll}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-white text-black hover:bg-gray-100 transition-colors shadow-sm disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Row 1 — Core Business ────────────────────────── */}
      <div className="animate-in-slide stagger-2">
        <SectionTitle>Core KPIs</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Revenue This Month"
            value={loading ? '—' : fmtCurrency(fin?.realRevenueThisMonth ?? 0)}
            sub={kpis ? `${kpis.revenueTrendPct}% vs last month` : undefined}
            subPositive={parseFloat(kpis?.revenueTrendPct ?? '0') >= 0}
            icon={Banknote}
            iconColor="text-emerald-500 bg-emerald-500"
            loading={loading}
          />
          <KpiCard
            title="Projected Revenue"
            value={loading ? '—' : fmtCurrency(fin?.projectedRevenueThisMonth ?? 0)}
            sub="From pending invoices"
            subPositive={true}
            icon={TrendingUp}
            iconColor="text-blue-500 bg-blue-500"
            loading={loading}
          />
          <KpiCard
            title="Active Clients"
            value={loading ? '—' : fmt(kpis?.activeClients ?? 0)}
            sub={kpis ? `${kpis.clientGrowthPct}% growth` : undefined}
            subPositive={parseFloat(kpis?.clientGrowthPct ?? '0') >= 0}
            icon={Users}
            iconColor="text-violet-500 bg-violet-500"
            loading={loading}
          />
          <KpiCard
            title="VIP Customers"
            value={loading ? '—' : fmt(kpis?.activeCustomers ?? 0)}
            sub="Highest tier accounts"
            subPositive={true}
            icon={Star}
            iconColor="text-black bg-black"
            loading={loading}
          />
        </div>
      </div>

      {/* ── KPI Row 2 — Ops + Stock ───────────────────────────── */}
      <div className="animate-in-slide stagger-2">
        <SectionTitle>Operations & Inventory</SectionTitle>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Active Work Orders"
            value={loading ? '—' : fmt(kpis?.activeWorkOrders ?? 0)}
            sub="In progress (no end date)"
            subPositive={false}
            icon={Wrench}
            iconColor="text-orange-500 bg-orange-500"
            loading={loading}
          />
          <KpiCard
            title="Pending Follow-ups"
            value={loading ? '—' : fmt(summary?.pendingFollowUpsCount ?? 0)}
            sub="Unsolved issues"
            subPositive={false}
            icon={Clock}
            iconColor="text-red-500 bg-red-500"
            loading={loading}
          />
          <KpiCard
            title="Low Stock Alerts"
            value={loading ? '—' : fmt(kpis?.totalLowStock ?? 0)}
            sub={kpis ? `${kpis.lowStockProducts} products · ${kpis.lowStockItems} parts` : undefined}
            subPositive={false}
            icon={AlertTriangle}
            iconColor="text-yellow-500 bg-yellow-500"
            loading={loading}
          />
          <KpiCard
            title="Inventory Value"
            value={loading ? '—' : fmtCurrency(fin?.totalInventoryValue ?? 0)}
            sub="Total stock value"
            subPositive={true}
            icon={Package}
            iconColor="text-cyan-500 bg-cyan-500"
            loading={loading}
          />
        </div>
      </div>

      {/* ── Charts Row 1 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in-slide stagger-3">

        {/* Sales Pipeline — Leads by Status */}
        <Card className="lg:col-span-2 modern-glass-card border-none premium-shadow m-auto w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                  Sales Pipeline
                </CardTitle>
                <CardDescription className="mt-0.5">Marketing leads by current status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[260px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.leadsByStatus ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: '13px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {(charts?.leadsByStatus ?? []).map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Ops Punctuality Pie */}
        <Card className="modern-glass-card border-none premium-shadow m-auto w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-[hsl(var(--primary))]" />
              Work Order Punctuality
            </CardTitle>
            <CardDescription className="mt-0.5">
              {loading ? '—' : `${charts?.punctuality.total ?? 0} total orders tracked`}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] flex flex-col items-center justify-center">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
            ) : punctualityPie[0]?.value === 0 && punctualityPie[1]?.value === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No punctuality data yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie data={punctualityPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {punctualityPie.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-500">{charts?.punctuality.onTimePct}%</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">On-Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{charts?.punctuality.latePct}%</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">Late</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in-slide stagger-3">

        {/* Orders by Quotation Status */}
        <Card className="modern-glass-card border-none premium-shadow m-auto w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-[hsl(var(--primary))]" />
              Sales Orders by Quotation
            </CardTitle>
            <CardDescription className="mt-0.5">Distribution across all quotation statuses</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.ordersByQuotation ?? []} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="status" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={{ borderRadius: '12px', backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: '13px' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {(charts?.ordersByQuotation ?? []).map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sales / Marketing Target Progress */}
        <Card className="modern-glass-card border-none premium-shadow m-auto w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--primary))]" />
              Company Targets
            </CardTitle>
            <CardDescription className="mt-0.5">Sales & marketing budget utilisation</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
              </div>
            ) : (
              <>
                {/* Sales Target */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-medium">Sales Target</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {fmtCurrency(fin?.realRevenueThisMonth ?? 0)} / {fmtCurrency(summary?.totalCompanySalesTarget ?? 0)}
                    </span>
                  </div>
                  {(() => {
                    const pct = summary?.totalCompanySalesTarget
                      ? Math.min((fin?.realRevenueThisMonth ?? 0) / summary.totalCompanySalesTarget * 100, 100)
                      : 0;
                    return (
                      <>
                        <div className="w-full bg-[hsl(var(--border))]/40 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-1000"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-right text-xs text-[hsl(var(--muted-foreground))] mt-1">{pct.toFixed(1)}% achieved</div>
                      </>
                    );
                  })()}
                </div>

                {/* Marketing Budget */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-medium">Marketing Budget</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      Budget: {fmtCurrency(summary?.totalCompanyMarketingBudget ?? 0)}
                    </span>
                  </div>
                  <div className="w-full bg-[hsl(var(--border))]/40 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000"
                      style={{ width: summary?.totalCompanyMarketingBudget ? '60%' : '0%' }}
                    />
                  </div>
                  <div className="text-right text-xs text-[hsl(var(--muted-foreground))] mt-1">Allocated</div>
                </div>

                {/* Low Stock Warning */}
                {(kpis?.totalLowStock ?? 0) > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        {kpis?.totalLowStock} low stock alerts
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {kpis?.lowStockProducts} products · {kpis?.lowStockItems} spare parts
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Lists Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in-slide stagger-4">

        {/* Pending Follow-ups */}
        <Card className="modern-glass-card border-none premium-shadow m-auto w-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              Pending Follow-ups
            </CardTitle>
            <CardDescription>{loading ? '—' : `${summary?.pendingFollowUpsCount ?? 0} unsolved issues`}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" /></div>
            ) : (lists?.pendingFollowUps.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[hsl(var(--muted-foreground))]">
                <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lists?.pendingFollowUps.slice(0, 5).map((f: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/60 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{f.customer?.name ?? 'Unknown Customer'}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                        {f.workOrder?.issue ?? f.notes ?? 'No details'}
                      </p>
                      {f.followUpDate && (
                        <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(f.followUpDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delayed Work Orders */}
        <Card className="modern-glass-card border-none premium-shadow m-auto w-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-500" />
              Delayed Work Orders
            </CardTitle>
            <CardDescription>{loading ? '—' : `${lists?.delayedWorkOrders.length ?? 0} late & open`}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" /></div>
            ) : (lists?.delayedWorkOrders.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[hsl(var(--muted-foreground))]">
                <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500" />
                <p className="text-sm">No delays right now!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lists?.delayedWorkOrders.slice(0, 5).map((wo: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/60 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                      <XCircle className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {wo.customerOrderId?.customerId?.name ?? 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                        {wo.reasonForDelay ?? 'No reason provided'}
                      </p>
                      {wo.createdAt && (
                        <p className="text-xs text-orange-400 mt-0.5">
                          Since {new Date(wo.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Feedback */}
        <Card className="modern-glass-card border-none premium-shadow m-auto w-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-500" />
              Recent Feedback
            </CardTitle>
            <CardDescription>Latest customer responses</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" /></div>
            ) : (lists?.recentFeedback.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[hsl(var(--muted-foreground))]">
                <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No feedback yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lists?.recentFeedback.slice(0, 5).map((fb: any, i: number) => {
                  const rating = fb.rating ?? 0;
                  const stars = Math.round(rating);
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/60 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                        <Star className="h-4 w-4 text-violet-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{fb.customerId?.name ?? 'Unknown'}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {Array.from({ length: 5 }).map((_, si) => (
                            <Star key={si} className={`h-3 w-3 ${si < stars ? 'text-amber-400 fill-amber-400' : 'text-[hsl(var(--border))]'}`} />
                          ))}
                        </div>
                        {fb.description && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate">{fb.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Active Campaigns Table ────────────────────────────── */}
      {(charts?.campaigns.length ?? 0) > 0 && (
        <Card className="modern-glass-card border-none premium-shadow m-auto w-full animate-in-slide stagger-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-[hsl(var(--primary))]" />
                Active Campaigns
              </CardTitle>
              <CardDescription>Currently running marketing campaigns</CardDescription>
            </div>
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] px-2 py-1 rounded-md">
              {charts?.campaigns.length} live
            </span>
          </CardHeader>
          <div className="w-full overflow-x-auto custom-table-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-[hsl(var(--border))]/50 bg-[hsl(var(--secondary))]/30">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Impressions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Conversions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]/30">
                {charts?.campaigns.slice(0, 5).map((c, i) => (
                  <tr key={i} className="hover:bg-[hsl(var(--card))]/60 transition-colors group">
                    <td className="px-6 py-3 font-medium truncate max-w-[200px]">{c.name}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                        {c.platform}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-[hsl(var(--muted-foreground))]">{(c.impressions ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-emerald-500 font-medium">{(c.conversions ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right font-semibold">{fmtCurrency(c.salesRevenue ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}