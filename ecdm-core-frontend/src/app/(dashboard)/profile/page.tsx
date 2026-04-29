'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
    User, Mail, Phone, MapPin, Briefcase, Lock, Camera,
    CheckCircle2, TrendingUp, ClipboardList, Calendar, Target, Loader2,
    DollarSign, CreditCard, ArrowRight, ListFilter
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import PerformanceScoreCard from '@/components/profile/PerformanceScoreCard';

interface SalesKPIs {
    tasksCompleted: number;
    openOrders: number;
    activeLeads: number;
    targetSales: number;
    achievedAmount: number;
    attendanceRate: number;
}

interface Profile360 {
    salesKPIs: SalesKPIs | null;
    performanceStats: {
        totalTasks: number;
        completed: number;
        punctualityRate: number;
    } | null;
    marketingKPIs?: {
        totalLeads: number;
        convertedLeadsCount: number;
        targetBudget: number;
        achievedAmount: number;
    } | null;
    attendance: {
        stats: {
            monthly: {
                presentRate: number;
            };
        };
    };
    salaries?: any[];
}

/* ── Stats Widget ─────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string | number;
    color: string;
}) => (
    <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
            <Icon size={16} className="text-white" />
        </div>
        <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
            <p className="text-lg font-bold">{value}</p>
        </div>
    </div>
);

/* ── Input ───────────────────────────────────────────────────── */
const Field = ({
    label, value, onChange, type = 'text', disabled = false, hint,
    icon: Icon,
}: {
    label: string;
    value: string;
    onChange?: (v: string) => void;
    type?: string;
    disabled?: boolean;
    hint?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}) => (
    <div className="space-y-1">
        <label className="text-xs font-medium text-[hsl(var(--foreground))]">{label}</label>
        <div className="relative">
            <Icon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
                type={type}
                value={value}
                onChange={e => onChange?.(e.target.value)}
                disabled={disabled}
                className={`w-full rounded-lg border border-[hsl(var(--border))] py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all ${disabled
                    ? 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] cursor-not-allowed opacity-70'
                    : 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))]'
                    }`}
            />
        </div>
        {hint && <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{hint}</p>}
    </div>
);

/* ── Page ─────────────────────────────────────────────────────── */
export default function ProfilePage() {
    const { user, loadUser } = useAuthStore();

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
    });
    const [saving, setSaving] = useState(false);

    const [profile360, setProfile360] = useState<Profile360 | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({
                firstName: user.firstName ?? '',
                lastName: user.lastName ?? '',
                phone: (user as unknown as Record<string, string>).phone ?? '',
                address: (user as unknown as Record<string, string>).address ?? '',
            });

            if (user._id) {
                const fetchProfile360 = async () => {
                    setLoadingProfile(true);
                    try {
                        const response = await api.get(`/hr/users/${user._id}/profile`);
                        const profileData = response.data?.data || response.data;
                        const mappedProfile: Profile360 = {
                            salesKPIs: profileData.salesKPIs || null,
                            marketingKPIs: profileData.marketingKPIs || null,
                            performanceStats: profileData.performanceStats || null,
                            attendance: profileData.attendance || { stats: { monthly: { presentRate: 0 } } },
                            salaries: profileData.salaries || [],
                        };
                        setProfile360(mappedProfile);
                    } catch (err) {
                        console.error('Failed to fetch profile data:', err);
                    } finally {
                        setLoadingProfile(false);
                    }
                };
                fetchProfile360();
            }
        }
    }, [user]);

    const salesKPIs = profile360?.salesKPIs;
    const attendanceRate = salesKPIs?.attendanceRate ?? profile360?.attendance?.stats?.monthly?.presentRate ?? 0;

    const progressPercentage = salesKPIs && salesKPIs.targetSales > 0
        ? Math.round((salesKPIs.achievedAmount / salesKPIs.targetSales) * 100)
        : 0;

    const marketingKPIs = profile360?.marketingKPIs;
    const marketingProgress = marketingKPIs && marketingKPIs.targetBudget > 0
        ? Math.round((marketingKPIs.achievedAmount / marketingKPIs.targetBudget) * 100)
        : 0;

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch('/users/me', form);
            await loadUser();
            toast.success('Profile updated successfully');
        } catch {
            toast.error('Failed to update profile');
        }
        setSaving(false);
    };

    const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
    const router = useRouter();

    const latestSalary = profile360?.salaries && profile360.salaries.length > 0 ? profile360.salaries[0] : null;
    const netSalary = latestSalary ? 
        (latestSalary.basicSalary + latestSalary.allowances + latestSalary.overtime + latestSalary.bonuses) - 
        (latestSalary.absenceDeduction + latestSalary.otherDeductions + latestSalary.tax + latestSalary.insurance)
        : 0;

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">My Profile</h1>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Manage your personal information and account settings.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* ── Left: Identity Card ─────────────────── */}
                <div className="space-y-4">

                    {/* Avatar Card */}
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col items-center gap-4 text-center">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white shadow-lg">
                                {initials}
                            </div>
                            <button className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={18} />
                            </button>
                        </div>

                        <div>
                            <p className="font-semibold text-base">{user?.firstName} {user?.lastName}</p>
                            <span className="mt-1 inline-flex items-center rounded-full bg-[hsl(var(--primary))]/10 px-2.5 py-0.5 text-[11px] font-medium text-[hsl(var(--primary))] capitalize">
                                {user?.role}
                            </span>
                        </div>

                        <div className="w-full pt-2 border-t border-[hsl(var(--border))] space-y-2 text-left">
                            <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                                <Mail size={12} />
                                <span className="truncate">{user?.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                                <div className={`h-2 w-2 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span>{user?.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>

                        <button
                            disabled
                            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[hsl(var(--border))] py-2 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/30 transition-colors disabled:cursor-not-allowed"
                            title="Coming soon"
                        >
                            <Camera size={12} />
                            Upload Photo
                        </button>
                    </div>

                    {/* Performance Card */}
                    <PerformanceScoreCard 
                        stats={profile360?.performanceStats || null} 
                        loading={loadingProfile} 
                    />

                    {/* Stats Card */}
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">My Activity</h3>
                        <div className="space-y-2">
                            {loadingProfile ? (
                                <>
                                    <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 opacity-50">
                                        <div className="h-9 w-9 rounded-lg bg-gray-300 animate-pulse" />
                                        <div><div className="h-3 w-20 bg-gray-300 rounded animate-pulse mb-1" /><div className="h-5 w-12 bg-gray-300 rounded animate-pulse" /></div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 opacity-50">
                                        <div className="h-9 w-9 rounded-lg bg-gray-300 animate-pulse" />
                                        <div><div className="h-3 w-20 bg-gray-300 rounded animate-pulse mb-1" /><div className="h-5 w-12 bg-gray-300 rounded animate-pulse" /></div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 opacity-50">
                                        <div className="h-9 w-9 rounded-lg bg-gray-300 animate-pulse" />
                                        <div><div className="h-3 w-20 bg-gray-300 rounded animate-pulse mb-1" /><div className="h-5 w-12 bg-gray-300 rounded animate-pulse" /></div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 opacity-50">
                                        <div className="h-9 w-9 rounded-lg bg-gray-300 animate-pulse" />
                                        <div><div className="h-3 w-20 bg-gray-300 rounded animate-pulse mb-1" /><div className="h-5 w-12 bg-gray-300 rounded animate-pulse" /></div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {['Operations', 'Maintenance', 'MaintenanceEngineer', 'Technician'].includes(user?.role || '') ? (
                                        <>
                                            <StatCard icon={CheckCircle2} label="Tasks Completed" value={profile360?.performanceStats?.completed ?? 0} color="bg-green-500" />
                                            <StatCard icon={ClipboardList} label="Total Tasks" value={profile360?.performanceStats?.totalTasks ?? 0} color="bg-blue-500" />
                                            <StatCard icon={TrendingUp} label="Punctuality Rate" value={`${profile360?.performanceStats?.punctualityRate ?? 0}%`} color="bg-amber-500" />
                                        </>
                                    ) : ['Marketing'].includes(user?.role || '') ? (
                                        <>
                                            <StatCard icon={CheckCircle2} label="Leads Converted" value={marketingKPIs?.convertedLeadsCount ?? 0} color="bg-green-500" />
                                            <StatCard icon={TrendingUp} label="Total Leads" value={marketingKPIs?.totalLeads ?? 0} color="bg-blue-500" />
                                            <StatCard icon={Target} label="Budget Achieved" value={`EGP ${(marketingKPIs?.achievedAmount || 0).toLocaleString()}`} color="bg-amber-500" />
                                        </>
                                    ) : (
                                        <>
                                            <StatCard icon={CheckCircle2} label="Tasks Completed" value={salesKPIs?.tasksCompleted ?? 0} color="bg-green-500" />
                                            <StatCard icon={TrendingUp} label="Active Leads" value={salesKPIs?.activeLeads ?? 0} color="bg-blue-500" />
                                            <StatCard icon={ClipboardList} label="Open Orders" value={salesKPIs?.openOrders ?? 0} color="bg-amber-500" />
                                        </>
                                    )}
                                    <StatCard icon={Calendar} label="Attendance Rate" value={`${attendanceRate}%`} color="bg-purple-500" />
                                </>
                            )}

                            {/* SALARY SUMMARY CARD (Visible to all authorized users) */}
                            {latestSalary ? (
                                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-900/30 p-4 transition-all hover:shadow-md">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                                                <DollarSign size={14} />
                                            </div>
                                            <span className="text-xs font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wider">Salary Summary</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1 mb-4">
                                        <div className="flex justify-between text-[10px] text-blue-700/70 dark:text-blue-300/70">
                                            <span>Basic Salary</span>
                                            <span>EGP {latestSalary.basicSalary.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-black text-blue-900 dark:text-blue-50">
                                            <span>Net Salary</span>
                                            <span>EGP {netSalary.toLocaleString()}</span>
                                        </div>
                                        <p className="text-[10px] text-blue-600/60 dark:text-blue-400/60 italic font-medium">
                                            Period: {latestSalary.month}/{latestSalary.year}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => router.push('/profile/salary')}
                                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 group"
                                    >
                                        View Details
                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl border border-dashed border-[hsl(var(--border))] p-4 text-center">
                                    <CreditCard size={20} className="mx-auto mb-2 text-[hsl(var(--muted-foreground))]" />
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">No salary data available yet.</p>
                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Check back once the month is processed.</p>
                                </div>
                            )}
                            
                            {/* TARGET BUDGET CARD (For Marketing / Admins) */}
                            {(user?.role === 'Marketing' || user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
                                <StatCard 
                                    icon={Target} 
                                    label="Target Budget" 
                                    value={`EGP ${((user as unknown as Record<string, number>).targetBudget || 0).toLocaleString()}`} 
                                    color="bg-blue-600" 
                                />
                            )}

                            {/* TARGET SALES CARD (For Sales / Admins) */}
                            {(user?.role === 'Sales' || user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
                                <StatCard 
                                    icon={Target} 
                                    label="Target Sales" 
                                    value={`EGP ${((user as unknown as Record<string, number>).targetSales || 0).toLocaleString()}`} 
                                    color="bg-emerald-600" 
                                />
                            )}
                        </div>
                    </div>

                    {/* Sales Performance Card - For Sales / Managers / Admins */}
                    {(user?.role === 'Sales' || user?.role === 'Manager' || user?.role === 'SuperAdmin' || user?.role === 'Admin') && (
                        <div className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-gray-900 p-4 space-y-3 shadow-sm transition-all hover:shadow-md">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    Sales Performance
                                </h3>
                            </div>

                            {loadingProfile ? (
                                <div className="flex items-center justify-center py-6 text-[hsl(var(--muted-foreground))]">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    <span className="text-xs">Loading...</span>
                                </div>
                            ) : salesKPIs ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Monthly Target</span>
                                        <span className="text-sm font-bold">EGP {(salesKPIs.targetSales || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Achieved</span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                            EGP {(salesKPIs.achievedAmount || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                                            <span>Progress</span>
                                            <span className="font-semibold">{progressPercentage}%</span>
                                        </div>
                                        <Progress 
                                            value={progressPercentage} 
                                            max={100}
                                            className="h-2 bg-emerald-100 dark:bg-emerald-900"
                                            indicatorClassName="bg-emerald-600 dark:bg-emerald-400"
                                        />
                                    </div>
                                    <p className="text-[10px] text-center text-[hsl(var(--muted-foreground))] mt-2 italic border-t border-[hsl(var(--border))] pt-2">
                                        Sales targets are managed by administration.
                                    </p>
                                </div>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">No sales target set</p>
                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Contact admin to set target</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Marketing Performance Card - For Marketing / Managers / Admins */}
                    {(user?.role === 'Marketing' || user?.role === 'Manager' || user?.role === 'SuperAdmin' || user?.role === 'Admin') && (
                        <div className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 p-4 space-y-3 shadow-sm transition-all hover:shadow-md">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5" />
                                    Marketing Performance
                                </h3>
                            </div>

                            {loadingProfile ? (
                                <div className="flex items-center justify-center py-6 text-[hsl(var(--muted-foreground))]">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    <span className="text-xs">Loading...</span>
                                </div>
                            ) : marketingKPIs ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Target Budget</span>
                                        <span className="text-sm font-bold">EGP {(marketingKPIs.targetBudget || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Converted Value</span>
                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                            EGP {(marketingKPIs.achievedAmount || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                                            <span>Progress</span>
                                            <span className="font-semibold">{marketingProgress}%</span>
                                        </div>
                                        <Progress 
                                            value={marketingProgress} 
                                            max={100}
                                            className="h-2 bg-blue-100 dark:bg-blue-900"
                                            indicatorClassName="bg-blue-600 dark:bg-blue-400"
                                        />
                                    </div>
                                    <p className="text-[10px] text-center text-[hsl(var(--muted-foreground))] mt-2 italic border-t border-[hsl(var(--border))] pt-2">
                                        Marketing targets are based on converted leads.
                                    </p>
                                </div>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">No marketing target set</p>
                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Contact admin to set target</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Performance Summary Card - For Operations / Sales / Maintenance / Managers / Admins */}
                    {(['Operations', 'Maintenance', 'MaintenanceEngineer', 'Technician', 'Sales', 'Manager', 'SuperAdmin', 'Admin'].includes(user?.role || '')) && (
                        <div className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 p-4 space-y-3 shadow-sm transition-all hover:shadow-md">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    {user?.role === 'Sales' ? 'Sales Performance Score' : 'Operations Performance Score'}
                                </h3>
                            </div>

                            {loadingProfile ? (
                                <div className="flex items-center justify-center py-6 text-[hsl(var(--muted-foreground))]">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    <span className="text-xs">Loading...</span>
                                </div>
                            ) : profile360?.performanceStats ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-xl bg-indigo-500/10 p-3 text-center border border-indigo-500/20">
                                            <p className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 opacity-70 mb-1">Completion</p>
                                            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                                                {profile360.performanceStats.totalTasks > 0 ? Math.round((profile360.performanceStats.completed / profile360.performanceStats.totalTasks) * 100) : 0}%
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-purple-500/10 p-3 text-center border border-purple-500/20">
                                            <p className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 opacity-70 mb-1">Punctuality</p>
                                            <p className="text-xl font-black text-purple-600 dark:text-purple-400">
                                                {profile360.performanceStats.punctualityRate}%
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 mt-2">
                                        <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                                            <span>Tasks Completed</span>
                                            <span className="font-semibold">{profile360.performanceStats.completed} / {profile360.performanceStats.totalTasks}</span>
                                        </div>
                                        <Progress 
                                            value={profile360.performanceStats.totalTasks > 0 ? (profile360.performanceStats.completed / profile360.performanceStats.totalTasks) * 100 : 0} 
                                            max={100}
                                            className="h-2 bg-indigo-100 dark:bg-indigo-900"
                                            indicatorClassName="bg-indigo-600 dark:bg-indigo-400"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">No performance data</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Right: Update Form ───────────────────── */}
                <div className="lg:col-span-2">
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-5">
                        <div>
                            <h2 className="text-sm font-semibold">Personal Information</h2>
                            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">Update your name and contact details.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="First Name"
                                icon={User}
                                value={form.firstName}
                                onChange={v => setForm(f => ({ ...f, firstName: v }))}
                            />
                            <Field
                                label="Last Name"
                                icon={User}
                                value={form.lastName}
                                onChange={v => setForm(f => ({ ...f, lastName: v }))}
                            />
                            <Field
                                label="Phone"
                                icon={Phone}
                                value={form.phone}
                                onChange={v => setForm(f => ({ ...f, phone: v }))}
                            />
                            <Field
                                label="Address"
                                icon={MapPin}
                                value={form.address}
                                onChange={v => setForm(f => ({ ...f, address: v }))}
                            />
                        </div>

                        {/* Divider */}
                        <div className="border-t border-[hsl(var(--border))] pt-4 space-y-4">
                            <div>
                                <h3 className="text-xs font-semibold text-[hsl(var(--foreground))]">Account Credentials</h3>
                                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">These fields are read-only. Contact your administrator to change them.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field
                                    label="Email Address"
                                    icon={Mail}
                                    value={user?.email ?? ''}
                                    disabled
                                    hint="Contact admin to change email"
                                />
                                <Field
                                    label="Password"
                                    icon={Lock}
                                    value="••••••••••"
                                    type="password"
                                    disabled
                                    hint="Contact admin to reset password"
                                />
                            </div>
                        </div>

                        {/* Save */}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[hsl(var(--primary))]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                            >
                                {saving ? (
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving…
                                    </span>
                                ) : (
                                    <>Save Changes</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom: My Evaluation Details (Performance Roles) ──────────────── */}
            {['Operations', 'Maintenance', 'MaintenanceEngineer', 'Technician', 'Sales', 'Manager', 'SuperAdmin', 'Admin'].includes(user?.role || '') && !loadingProfile && profile360 && (
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 mt-4 overflow-hidden">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-[hsl(var(--primary))]" />
                            My Evaluation Details
                        </h2>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                            Performance evaluation based on work orders and feedback.
                        </p>
                    </div>
                    <div className="w-full overflow-x-auto custom-table-scrollbar border border-[hsl(var(--border))] rounded-xl">
                        <table className="w-full caption-bottom text-xs whitespace-nowrap">
                            <thead className="bg-[hsl(var(--muted))]/50 border-b border-[hsl(var(--border))]">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">EmployeeName</th>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">Role</th>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">Sector</th>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">Type Of Order</th>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">Punctuality</th>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">Task Completed</th>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">Task Returned</th>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">Completion Rate</th>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">Return Rate</th>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">Performance Score</th>
                                    <th className="px-3 py-2 text-left font-semibold text-[hsl(var(--muted-foreground))]">HR Approved</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--border))]">
                                {(() => {
                                    const totalTasks = profile360?.performanceStats?.totalTasks || 0;
                                    const completed = profile360?.performanceStats?.completed || 0;
                                    const returned = Math.max(0, totalTasks - completed);
                                    const completionRate = totalTasks > 0 ? ((completed / totalTasks) * 100).toFixed(1) + '%' : '0%';
                                    const returnRate = totalTasks > 0 ? ((returned / totalTasks) * 100).toFixed(1) + '%' : '0%';
                                    
                                    // Extract type of order if available from records
                                    const typeOfOrder = (profile360 as any)?.workOrders?.records?.[0]?.customerOrderId?.typeOfOrder || 'Maintenance';

                                    return (
                                        <tr className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                                            <td className="px-3 py-2.5 font-medium">{user?.firstName} {user?.lastName}</td>
                                            <td className="px-3 py-2.5">{user?.role}</td>
                                            <td className="px-3 py-2.5">{(user as any)?.department || 'Operations'}</td>
                                            <td className="px-3 py-2.5">{typeOfOrder}</td>
                                            <td className="px-3 py-2.5">{profile360?.performanceStats?.punctualityRate || 0}%</td>
                                            <td className="px-3 py-2.5 font-semibold text-green-600 dark:text-green-400">{completed}</td>
                                            <td className="px-3 py-2.5 font-semibold text-red-600 dark:text-red-400">{returned}</td>
                                            <td className="px-3 py-2.5 font-bold">{completionRate}</td>
                                            <td className="px-3 py-2.5 text-red-600/80">{returnRate}</td>
                                            <td className="px-3 py-2.5 font-black text-[hsl(var(--primary))]">{completionRate}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                    (user as any)?.hrApproved 
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                    {(user as any)?.hrApproved ? 'HR Approved' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

