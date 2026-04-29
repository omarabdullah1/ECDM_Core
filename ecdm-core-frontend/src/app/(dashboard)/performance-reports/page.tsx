"use client";

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Users, Briefcase, Activity, UserCheck, Loader2 } from 'lucide-react';

// ─── THEME ────────────────────────────────────────────────────────────────────

const C = {
  primary:   '#2563eb',
  secondary: '#64748b',
  success:   '#10b981',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  info:      '#0ea5e9',
};

// ─── SHARED TOOLTIP STYLE ─────────────────────────────────────────────────────

const tipStyle = {
  contentStyle: {
    borderRadius: 10,
    border: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
    fontSize: 12,
  },
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function ModernCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
          <Icon size={20} />
        </div>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h2>
      </div>
      <div className="p-6 flex-1">{children}</div>
    </div>
  );
}

function DataItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={`text-sm ${
          highlight
            ? 'font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-500/20'
            : 'font-semibold text-slate-800 dark:text-slate-200'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── STATIC FALLBACKS (HR, Ops, Employee — pending dedicated APIs) ────────────

const employeeBar  = [{ name: 'Tasks', Completed: 120, Returned: 5 }];
const opsLine = [
  { name: '1', error: 10 }, { name: '2', error: 9 }, { name: '3', error: 8 },
  { name: '4', error: 7  }, { name: '5', error: 6  },
];
const hrPie = [
  { name: 'Present', value: 92, color: C.success },
  { name: 'Absent',  value: 8,  color: C.danger  },
];
const hrBar = [{ name: 'Days', Mon: 10, Tue: 7, Wed: 5, Thu: 8, Fri: 8 }];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function PerformanceDashboard() {
  const [isLoading, setIsLoading] = useState(true);

  // Real + Placeholder Data States (Matching Notebook requirements)
  const [salesMetrics, setSalesMetrics] = useState({ 
    totalOrders: 0, 
    newClients: 0, 
    closedDeals: 0,
    salesName: "System Overall", // Placeholder for actual sales rep name
    targetSales: 750000,         // Placeholder target
    actualSales: 0,              // Will be calculated from invoice APIs later
    performance: "0%",
    feedback: "4.8 / 5.0"
  });
  
  const [marketingMetrics, setMarketingMetrics] = useState({ 
    totalLeads: 0, 
    convertedLeads: 0, 
    conversionRate: "0%",
    creator: "Ahmed Samir",      // Placeholder
    budgetAllocated: 50000,
    budgetUsed: 35000,
    revenue: 120000,
    roas: "3.4x"
  });
  const [salesPieData, setSalesPieData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [leadsRes, ordersRes] = await Promise.all([
          fetch('/api/sales/leads'),
          fetch('/api/sales/orders'),
        ]);

        // Explicit HTTP-level error logging
        if (!leadsRes.ok || !ordersRes.ok) {
          console.error(
            'API Error -> Leads:',  leadsRes.status,  leadsRes.statusText,
            '| Orders:', ordersRes.status, ordersRes.statusText,
          );
        }

        const leads  = await leadsRes.json();
        const orders = await ordersRes.json();

        // Raw response debug — check the browser console if values show 0
        console.log('[PerformanceDashboard] Fetched leads:', leads);
        console.log('[PerformanceDashboard] Fetched orders:', orders);

        // ── Sales ──────────────────────────────────────────────────────────────
        const validOrders: Record<string, unknown>[] = Array.isArray(orders) ? orders : [];
        const closed = validOrders.filter(
          (o) => o.finalStatus === 'Completed' || o.quotationStatus === 'Accepted',
        ).length;

        setSalesMetrics(prev => ({
          ...prev,
          totalOrders: validOrders.length,
          closedDeals: closed,
          newClients:  validOrders.length,
        }));

        // Pie — orders by type (leave empty if no data so empty state renders)
        if (validOrders.length > 0) {
          const typeMap: Record<string, number> = {};
          for (const o of validOrders) {
            const t = (o.typeOfOrder as string) || 'Unspecified';
            typeMap[t] = (typeMap[t] ?? 0) + 1;
          }
          const palette = [C.primary, C.success, C.warning, C.info];
          const pie = Object.entries(typeMap).map(([name, value], i) => ({
            name,
            value,
            color: palette[i % palette.length],
          }));
          setSalesPieData(pie);
        } else {
          setSalesPieData([]); // triggers empty state in JSX
        }

        // ── Marketing ──────────────────────────────────────────────────────────
        const validLeads: Record<string, unknown>[] = Array.isArray(leads) ? leads : [];
        const converted = validLeads.filter((l) => l.order === 'Yes').length;
        const rate =
          validLeads.length > 0
            ? ((converted / validLeads.length) * 100).toFixed(1)
            : '0';

        setMarketingMetrics(prev => ({
          ...prev,
          totalLeads:     validLeads.length,
          convertedLeads: converted,
          conversionRate: `${rate}%`,
        }));
      } catch (err) {
        console.error('[PerformanceDashboard] Fetch failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans transition-colors duration-200">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Performance Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Live overview of company data</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* MARKETING CONSOLIDATED CARD */}
        <ModernCard title="Marketing Department" icon={TrendingUp}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col justify-center">
              <DataItem label="Marketing Creator" value={marketingMetrics.creator} />
              <DataItem label="Budget Allocated" value={`EGP ${marketingMetrics.budgetAllocated.toLocaleString()}`} />
              <DataItem label="Budget Used" value={`EGP ${marketingMetrics.budgetUsed.toLocaleString()}`} />
              <DataItem label="Revenue Generated" value={`EGP ${marketingMetrics.revenue.toLocaleString()}`} highlight />
              <DataItem label="ROAS" value={marketingMetrics.roas} />
              <DataItem label="Total Leads Captured" value={marketingMetrics.totalLeads} />
              <DataItem label="Conversion Rate" value={marketingMetrics.conversionRate} highlight />
            </div>
            <div className="space-y-4">
              <div className="h-40 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                {marketingMetrics.totalLeads > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'Performance', Budget: marketingMetrics.budgetUsed, Revenue: marketingMetrics.revenue }]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.2)" />
                      <XAxis dataKey="name" hide />
                      <Tooltip cursor={{fill: 'rgba(150, 150, 150, 0.1)'}} />
                      <Legend wrapperStyle={{fontSize: '12px'}} />
                      <Bar dataKey="Budget" fill={C.secondary} radius={[4,4,0,0]} barSize={40} />
                      <Bar dataKey="Revenue" fill={C.primary} radius={[4,4,0,0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-sm font-medium text-slate-400 dark:text-slate-500">No marketing data available.</span>
                )}
              </div>
            </div>
          </div>
        </ModernCard>

        {/* SALES CONSOLIDATED CARD */}
        <ModernCard title="Sales Department" icon={Briefcase}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col justify-center">
              <DataItem label="Sales Name" value={salesMetrics.salesName} />
              <DataItem label="Target Sales" value={`EGP ${salesMetrics.targetSales.toLocaleString()}`} />
              <DataItem label="Actual Sales" value={`EGP ${salesMetrics.actualSales.toLocaleString()}`} highlight />
              <DataItem label="Performance Score" value={salesMetrics.performance} />
              <DataItem label="New Clients" value={salesMetrics.newClients} />
              <DataItem label="Deals Closed" value={salesMetrics.closedDeals} highlight />
              <DataItem label="Customer Feedback" value={salesMetrics.feedback} />
            </div>
            <div className="space-y-4">
               <div className="h-40 relative flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  {salesMetrics.totalOrders > 0 ? (
                    <>
                      <span className="text-xs font-bold text-slate-500 mb-1">Orders by Type</span>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={salesPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" stroke="none">
                            {salesPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-slate-400 dark:text-slate-500">No orders completed yet.</span>
                  )}
               </div>
            </div>
          </div>
        </ModernCard>

        {/* ── EMPLOYEE EVALUATION (static — pending API) ─────────── */}
        <ModernCard title="Employee Evaluation" icon={UserCheck}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col justify-center">
              <DataItem label="Name"               value="System Avg" />
              <DataItem label="Tasks Completed"    value="120" highlight />
              <DataItem label="Completion Rate"    value="96%" />
              <DataItem label="Performance Score"  value="90%" />
            </div>
            <div style={{ height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeBar} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.2)" />
                  <XAxis dataKey="name" hide />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} {...tipStyle} />
                  <Bar dataKey="Completed" fill={C.primary} radius={[4, 4, 0, 0]} barSize={24} name="Completed" />
                  <Bar dataKey="Returned"  fill={C.danger}  radius={[4, 4, 0, 0]} barSize={24} name="Returned" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ModernCard>

        {/* ── OPERATIONS (static — pending API) ─────────────────── */}
        <ModernCard title="Operations Department" icon={Activity}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col justify-center">
              <DataItem label="Total Tasks"     value="200" />
              <DataItem label="Tasks Completed" value="180" highlight />
              <DataItem label="Error Rate"      value="8%" />
              <DataItem label="Overall Status"  value={<span className="text-emerald-600 font-bold">Stable</span>} />
            </div>
            <div className="flex flex-col items-center" style={{ height: 130 }}>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Error Rate Trend
              </span>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={opsLine}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.2)" />
                  <Tooltip {...tipStyle} />
                  <Line
                    type="monotone"
                    dataKey="error"
                    stroke={C.secondary}
                    strokeWidth={3}
                    dot={{ r: 4, fill: C.danger, strokeWidth: 2, stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ModernCard>

        {/* ── HR REPORT — full width (static — pending API) ──────── */}
        <div className="xl:col-span-2">
          <ModernCard title="HR Report" icon={Users}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* KPIs */}
              <div className="flex flex-col justify-center">
                <DataItem label="Recruitment Rate" value="85%" />
                <DataItem label="Attendance Rate"  value="92%" highlight />
                <DataItem label="HR Efficiency"    value="90%" />
              </div>

              {/* Attendance Donut */}
              <div style={{ height: 192 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={hrPie}
                      cx="50%" cy="45%"
                      innerRadius={40} outerRadius={68}
                      dataKey="value"
                      stroke="none"
                      startAngle={90} endAngle={-270}
                    >
                      {hrPie.map((entry, i) => (
                        <Cell key={`hr-cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tipStyle} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Attendance Bar */}
              <div className="flex flex-col items-center" style={{ height: 192 }}>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Weekly Attendance
                </span>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hrBar}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.2)" />
                    <XAxis dataKey="name" hide />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} {...tipStyle} />
                    <Bar dataKey="Mon" fill={C.primary}  radius={[4, 4, 0, 0]} name="Mon" />
                    <Bar dataKey="Tue" fill={C.warning}  radius={[4, 4, 0, 0]} name="Tue" />
                    <Bar dataKey="Wed" fill={C.success}  radius={[4, 4, 0, 0]} name="Wed" />
                    <Bar dataKey="Thu" fill={C.success}  radius={[4, 4, 0, 0]} name="Thu" />
                    <Bar dataKey="Fri" fill={C.info}     radius={[4, 4, 0, 0]} name="Fri" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ModernCard>
        </div>

      </div>
    </div>
  );
}

