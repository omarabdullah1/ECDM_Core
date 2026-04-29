'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import {
    ArrowLeft, Calendar, DollarSign, TrendingUp, AlertCircle, 
    ArrowUpRight, ArrowDownRight, Info, ChevronRight, Calculator,
    ShieldCheck, Wallet, Receipt, CreditCard
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

interface SalaryRecord {
    _id: string;
    employeeId: string;
    employeeName: string;
    basicSalary: number;
    allowances: number;
    overtime: number;
    bonuses: number;
    tax: number;
    insurance: number;
    absenceDeduction: number;
    otherDeductions: number;
    month: number;
    year: number;
    notes?: string;
    attendanceDetails?: {
        presentDays: number;
        absentDays: number;
        lateDays: number;
    };
}

export default function SalaryDetailsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<SalaryRecord | null>(null);

    useEffect(() => {
        const fetchSalaries = async () => {
            if (!user?._id) return;
            setLoading(true);
            try {
                const response = await api.get(`/hr/users/${user._id}/profile`);
                const data = response.data?.data || response.data;
                const sortedSalaries = (data.salaries || []).sort((a: any, b: any) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return b.month - a.month;
                });
                setSalaries(sortedSalaries);
                if (sortedSalaries.length > 0) {
                    setSelectedMonth(sortedSalaries[0]);
                }
            } catch (err) {
                console.error('Failed to fetch salary data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSalaries();
    }, [user]);

    const calculateNet = (s: SalaryRecord) => {
        return (s.basicSalary + s.allowances + s.overtime + s.bonuses) - 
               (s.absenceDeduction + s.otherDeductions + s.tax + s.insurance);
    };

    const chartData = [...salaries].reverse().map(s => ({
        name: `${s.month}/${s.year}`,
        net: calculateNet(s),
        gross: s.basicSalary + s.allowances + s.overtime + s.bonuses,
        deductions: s.absenceDeduction + s.otherDeductions + s.tax + s.insurance
    }));

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">Fetching financial records...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-4">
                    <button 
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-blue-600 transition-colors group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Profile | العودة للملف الشخصي
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[hsl(var(--foreground))] tracking-tight">
                            Salary & Financial 360
                        </h1>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                            Detailed breakdown of your monthly earnings and deductions.
                        </p>
                    </div>
                </div>
                
                {salaries.length > 0 && (
                    <div className="flex items-center gap-3 bg-blue-600 text-white rounded-2xl px-6 py-4 shadow-xl shadow-blue-600/20">
                        <Wallet size={24} />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Latest Net Salary</p>
                            <p className="text-2xl font-black">EGP {calculateNet(salaries[0]).toLocaleString()}</p>
                        </div>
                    </div>
                )}
            </div>

            {salaries.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-[hsl(var(--border))] p-12 text-center space-y-4 bg-white dark:bg-black/20">
                    <div className="h-16 w-16 rounded-full bg-[hsl(var(--muted))]/30 flex items-center justify-center mx-auto text-[hsl(var(--muted-foreground))]">
                        <AlertCircle size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">No Records Found</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Your salary data will appear here once processed by the finance department.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column: Chart & History */}
                    <div className="lg:col-span-8 space-y-8">
                        
                        {/* Trend Chart */}
                        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <TrendingUp size={16} className="text-blue-600" />
                                    Earnings Trend | اتجاه المستحقات
                                </h3>
                                <div className="flex items-center gap-4 text-[10px] font-bold uppercase">
                                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-600" /> Net Salary</div>
                                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Gross</div>
                                </div>
                            </div>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
                                        />
                                        <YAxis 
                                            hide 
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: 'hsl(var(--card))', 
                                                borderRadius: '12px', 
                                                border: '1px solid hsl(var(--border))',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                            }}
                                            itemStyle={{ fontSize: '11px', fontWeight: 700 }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="gross" 
                                            stroke="#10b981" 
                                            fill="transparent" 
                                            strokeWidth={2}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="net" 
                                            stroke="#2563eb" 
                                            fillOpacity={1} 
                                            fill="url(#colorNet)" 
                                            strokeWidth={3}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Monthly List */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold flex items-center gap-2 px-2">
                                <Receipt size={16} className="text-blue-600" />
                                Monthly Ledger | سجل الرواتب الشهري
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {salaries.map((s) => (
                                    <button 
                                        key={s._id}
                                        onClick={() => setSelectedMonth(s)}
                                        className={`group relative text-left p-4 rounded-2xl border transition-all ${
                                            selectedMonth?._id === s._id 
                                            ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-600/5 dark:bg-blue-900/10' 
                                            : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-blue-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={12} className="text-[hsl(var(--muted-foreground))]" />
                                                    <span className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">
                                                        {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(s.year, s.month - 1))}
                                                    </span>
                                                </div>
                                                <p className="text-lg font-black text-[hsl(var(--foreground))]">
                                                    EGP {calculateNet(s).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                                                selectedMonth?._id === s._id ? 'bg-blue-600 text-white' : 'bg-[hsl(var(--muted))]/50'
                                            }`}>
                                                <ChevronRight size={16} className={selectedMonth?._id === s._id ? 'animate-bounce-x' : ''} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Detailed Breakdown */}
                    <div className="lg:col-span-4 lg:sticky lg:top-8 self-start">
                        {selectedMonth && (
                            <div className="rounded-3xl border border-blue-200 bg-white dark:bg-blue-950/20 dark:border-blue-900 p-8 shadow-2xl space-y-8 animate-in-slide">
                                <div>
                                    <h2 className="text-xl font-black">Period Breakdown</h2>
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                                        {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(selectedMonth.year, selectedMonth.month - 1))}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    {/* Earnings Section */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase text-[hsl(var(--muted-foreground))] tracking-[0.2em] flex items-center gap-2">
                                            <ArrowUpRight size={12} className="text-emerald-500" />
                                            Earnings | المستحقات
                                        </h4>
                                        <div className="space-y-2">
                                            <BreakdownRow label="Basic Salary" value={selectedMonth.basicSalary} />
                                            <BreakdownRow label="Allowances" value={selectedMonth.allowances} />
                                            <BreakdownRow label="Overtime" value={selectedMonth.overtime} />
                                            <BreakdownRow label="Bonuses" value={selectedMonth.bonuses} />
                                        </div>
                                    </div>

                                    {/* Deductions Section */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase text-[hsl(var(--muted-foreground))] tracking-[0.2em] flex items-center gap-2">
                                            <ArrowDownRight size={12} className="text-rose-500" />
                                            Deductions / Discounts | الخصومات
                                        </h4>
                                        <div className="space-y-2">
                                            <BreakdownRow label="Absence Deductions" value={selectedMonth.absenceDeduction} isNegative />
                                            <BreakdownRow label="Commercial Discounts" value={selectedMonth.otherDeductions} isNegative />
                                            <BreakdownRow label="Tax / Taxes" value={selectedMonth.tax} isNegative />
                                            <BreakdownRow label="Social Insurance" value={selectedMonth.insurance} isNegative />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-blue-100 dark:border-blue-900">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Net Disbursed | الصافي المصروف</p>
                                            <p className="text-3xl font-black text-blue-600">EGP {calculateNet(selectedMonth).toLocaleString()}</p>
                                        </div>
                                        <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600">
                                            <ShieldCheck size={28} />
                                        </div>
                                    </div>
                                    
                                    {selectedMonth.notes && (
                                        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3 flex gap-2 border border-amber-100 dark:border-amber-900/50">
                                            <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-amber-700 dark:text-amber-400 italic leading-relaxed">
                                                {selectedMonth.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                
                                <button className="w-full py-3 rounded-2xl border-2 border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2">
                                    <Receipt size={14} />
                                    Download Pay Slip
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function BreakdownRow({ label, value, isNegative }: { label: string; value: number; isNegative?: boolean }) {
    if (value === 0) return null;
    return (
        <div className="flex justify-between items-center group">
            <span className="text-xs font-medium text-[hsl(var(--foreground))] group-hover:text-blue-600 transition-colors">{label}</span>
            <span className={`text-xs font-bold ${isNegative ? 'text-rose-500' : 'text-emerald-600'}`}>
                {isNegative ? '-' : '+'} EGP {value.toLocaleString()}
            </span>
        </div>
    );
}

