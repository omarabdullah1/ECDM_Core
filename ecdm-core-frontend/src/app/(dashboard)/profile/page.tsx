'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
    User, Mail, Phone, MapPin, Briefcase, Lock, Camera,
    CheckCircle2, TrendingUp, ClipboardList, Calendar, Target, Loader2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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

    // Sales Performance State
    const [performance, setPerformance] = useState<{
        targetAmount: number;
        achievedAmount: number;
        progressPercentage: number;
        month: number;
        year: number;
    } | null>(null);
    const [loadingPerformance, setLoadingPerformance] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({
                firstName: user.firstName ?? '',
                lastName: user.lastName ?? '',
                phone: (user as unknown as Record<string, string>).phone ?? '',
                address: (user as unknown as Record<string, string>).address ?? '',
            });

            // Fetch performance data for Sales role
            if (user.role === 'Sales' || user.role === 'Manager' || user.role === 'SuperAdmin') {
                // Immediately invoke fetch with the current user ID
                const fetchPerformanceData = async () => {
                    if (!user._id) {
                        console.warn('User ID is undefined, cannot fetch performance');
                        return;
                    }
                    
                    setLoadingPerformance(true);
                    try {
                        const { data } = await api.get('/sales/targets/performance', {
                            params: { salespersonId: user._id },
                        });
                        setPerformance(data.data);
                    } catch (err) {
                        console.error('Failed to fetch performance:', err);
                        // Don't show error toast - just fail silently if no target set
                    } finally {
                        setLoadingPerformance(false);
                    }
                };

                fetchPerformanceData();
            }
        }
    }, [user]);

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

                    {/* Stats Card */}
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">My Activity</h3>
                        <div className="space-y-2">
                            <StatCard icon={CheckCircle2} label="Tasks Completed" value="—" color="bg-green-500" />
                            <StatCard icon={TrendingUp} label="Active Leads" value="—" color="bg-blue-500" />
                            <StatCard icon={ClipboardList} label="Open Orders" value="—" color="bg-amber-500" />
                            <StatCard icon={Calendar} label="Attendance Rate" value="—" color="bg-purple-500" />
                            
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

                    {/* Sales Performance Card - Only for Sales roles */}
                    {(user?.role === 'Sales' || user?.role === 'Manager' || user?.role === 'SuperAdmin') && (
                        <div className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5" />
                                    Sales Performance
                                </h3>
                            </div>

                            {loadingPerformance ? (
                                <div className="flex items-center justify-center py-6 text-[hsl(var(--muted-foreground))]">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    <span className="text-xs">Loading...</span>
                                </div>
                            ) : performance ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Monthly Target</span>
                                        <span className="text-sm font-bold">${performance.targetAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Achieved</span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                            ${performance.achievedAmount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                                            <span>Progress</span>
                                            <span className="font-semibold">{performance.progressPercentage}%</span>
                                        </div>
                                        <Progress 
                                            value={performance.progressPercentage} 
                                            max={100}
                                            className="h-2 bg-blue-100 dark:bg-blue-900"
                                            indicatorClassName="bg-blue-600 dark:bg-blue-400"
                                        />
                                    </div>
                                    <p className="text-[10px] text-center text-[hsl(var(--muted-foreground))] mt-2 italic border-t border-[hsl(var(--border))] pt-2">
                                        Targets are managed by administration.
                                    </p>
                                </div>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">No target set for this month</p>
                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Contact your manager to set a target</p>
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
                                    <span className="flex items-center gap-2">
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
        </div>
    );
}
