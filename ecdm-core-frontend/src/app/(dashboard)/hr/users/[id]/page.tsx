'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
    ArrowLeft, User, Calendar, Briefcase, FileText,
    Mail, Phone, MapPin, Shield, Clock,
    CheckCircle, XCircle, AlertCircle, Upload, Trash2,
    Download, ExternalLink, TrendingUp, Award, Target, Loader2
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuth';
import { Progress } from '@/components/ui/progress';

interface EmployeeDocument {
    _id: string;
    title: string;
    fileUrl: string;
    uploadedAt: string;
}

interface Employee {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    phone?: string;
    address?: string;
    employeeId?: string;
    avatarUrl?: string;
    documents?: EmployeeDocument[];
    createdAt: string;
    targetBudget?: number;
    targetSales?: number;
    maxDiscountPercentage?: number;
    commissionPercentage?: number;
    department?: string;
    salary?: number;
}

interface AttendanceRecord {
    _id: string;
    employeeId: string;
    date: string;
    day: string;
    checkIn: string;
    checkOut: string;
    status: string;
    notes: string;
}

interface AttendanceStats {
    monthly: {
        total: number;
        breakdown: Record<string, number>;
        presentRate: number;
    };
    yearly: {
        total: number;
        breakdown: Record<string, number>;
        presentRate: number;
    };
}

interface WorkOrderRecord {
    _id: string;
    customerOrderId?: {
        _id: string;
        typeOfOrder: string;
        issue: string;
        customerId?: {
            name: string;
        };
    };
    maintenanceEngineer: string;
    taskDate?: string;
    punctuality: string;
    taskCompleted: string;
    rating?: string;
    createdAt: string;
}

interface PerformanceStats {
    total: number;
    completed: number;
    completionRate: number;
    onTime: number;
    punctualityRate: number;
}

interface SalesOrderRecord {
    _id: string;
    salesOrderId?: string;
    customer?: { name: string };
    typeOfOrder?: string;
    salesDataTypeOfOrder?: string;
    quotationStatusFirstFollowUp?: string;
    statusSecondFollowUp?: string;
    finalStatusThirdFollowUp?: string;
    quotation?: { grandTotal: number };
    createdAt: string;
}

interface SalesKPIs {
    tasksCompleted: number;
    openOrders: number;
    targetSales: number;
    achievedAmount: number;
    salesOrders: SalesOrderRecord[];
}

interface ProfileData {
    employee: Employee;
    attendance: {
        records: AttendanceRecord[];
        stats: AttendanceStats;
    };
    workOrders: {
        records: WorkOrderRecord[];
        stats: PerformanceStats;
    };
    salesKPIs?: SalesKPIs | null;
}

type TabKey = 'info' | 'attendance' | 'tasks' | 'documents';

const STATUS_STYLES: Record<string, string> = {
    Present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Half-day': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Leave: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const ROLE_LABELS: Record<string, string> = {
    SuperAdmin: 'Super Admin',
    Manager: 'Manager',
    Sales: 'Sales',
    Operations: 'Operations',
    Maintenance: 'Maintenance',
    HR: 'HR',
    MaintenanceEngineer: 'Maintenance Engineer',
    Technician: 'Technician',
    CustomerService: 'Customer Service',
};

const inputClass = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

export default function EmployeeProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const employeeId = params.id as string;

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('info');
    
    const [salesPerformance, setSalesPerformance] = useState<{
        targetAmount: number;
        achievedAmount: number;
        progressPercentage: number;
        month: number;
        year: number;
    } | null>(null);
    const [loadingSalesPerformance, setLoadingSalesPerformance] = useState(false);
    
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docTitle, setDocTitle] = useState('');
    const [docFile, setDocFile] = useState<File | null>(null);

    const [internalPreviewMode, setInternalPreviewMode] = useState(true);

    const canEdit = user?.role && ['SuperAdmin', 'Manager', 'HR'].includes(user.role);
    const effectivelyReadOnly = internalPreviewMode;

    // Commission & discount editing
    const [editingRates, setEditingRates] = useState(false);
    const [savingRates, setSavingRates] = useState(false);
    const [ratesForm, setRatesForm] = useState({
        commissionPercentage: 0,
        maxDiscountPercentage: 0,
    });

    const handleUpdateRates = async () => {
        setSavingRates(true);
        try {
            await api.patch(`/hr/users/${employeeId}`, ratesForm);
            toast.success('Commission rates updated successfully');
            setProfile(prev => prev ? {
                ...prev,
                employee: {
                    ...prev.employee,
                    ...ratesForm
                }
            } : null);
            setEditingRates(false);
        } catch (err: any) {
            console.error('Failed to update rates:', err);
            toast.error(err.response?.data?.message || 'Failed to update rates');
        } finally {
            setSavingRates(false);
        }
    };


    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get(`/hr/users/${employeeId}/profile`);
                const profileData = response.data?.data || response.data;
                
                const mappedProfile = {
                    employee: profileData.employee || profileData.item?.employee || profileData,
                    attendance: profileData.attendance || profileData.item?.attendance || { records: [], stats: { monthly: { breakdown: {}, presentRate: 0 }, yearly: { breakdown: {}, presentRate: 0 } } },
                    workOrders: profileData.workOrders || profileData.item?.workOrders || { records: [], stats: { total: 0, completed: 0, completionRate: 0, onTime: 0, punctualityRate: 0 } },
                    salesKPIs: profileData.salesKPIs || profileData.item?.salesKPIs || null,
                };

                setProfile(mappedProfile as ProfileData);

                if (mappedProfile.employee?.role === 'Sales') {
                    fetchSalesPerformance();
                }
            } catch (err: any) {
                setError('Failed to load employee profile.');
                console.error(err);
            }
            setLoading(false);
        };

        const fetchSalesPerformance = async () => {
            setLoadingSalesPerformance(true);
            try {
                const { data } = await api.get('/sales/targets/performance', {
                    params: { salespersonId: employeeId },
                });
                setSalesPerformance(data?.data ?? data ?? null);
            } catch (err) {
                console.error('Failed to fetch sales performance:', err);
            } finally {
                setLoadingSalesPerformance(false);
            }
        };

        fetchProfile();
    }, [employeeId]);

    const handleDocumentUpload = async () => {
        toast.error('Document upload not available yet. Backend endpoint pending.');
    };

    const handleDocumentDelete = async (docId: string) => {
        toast.error('Document delete not available yet. Backend endpoint pending.');
    };

    const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: 'info', label: 'Profile Info', icon: <User className="h-4 w-4" /> },
        { key: 'attendance', label: 'Attendance', icon: <Calendar className="h-4 w-4" /> },
        { key: 'tasks', label: 'Tasks & Performance', icon: <Briefcase className="h-4 w-4" /> },
        { key: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[hsl(var(--primary))]" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <p className="text-lg font-medium">{error || 'Employee not found'}</p>
                <button onClick={() => router.back()} className="text-[hsl(var(--primary))] underline">
                    Go back
                </button>
            </div>
        );
    }

    const { employee, attendance, workOrders } = profile;

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <Link
                    href="/hr/users"
                    className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Employees
                </Link>

                {canEdit && (
                    <button
                        onClick={() => setInternalPreviewMode(!internalPreviewMode)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-sm ${internalPreviewMode
                                ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20'
                                : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90'
                            }`}
                    >
                        {internalPreviewMode ? (
                            <>
                                <TrendingUp className="h-4 w-4" />
                                Edit Profile
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                Finish Editing
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 relative overflow-hidden">
                {effectivelyReadOnly && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl z-10">
                        Preview Mode
                    </div>
                )}
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                        <div className="h-32 w-32 rounded-2xl bg-[hsl(var(--primary))]/10 flex items-center justify-center overflow-hidden">
                            {employee.avatarUrl ? (
                                <img src={employee.avatarUrl} alt={employee.fullName ?? 'Employee'} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-4xl font-bold text-[hsl(var(--primary))]">
                                    {employee.firstName?.[0] ?? ''}{employee.lastName?.[0] ?? ''}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h1 className="text-2xl font-bold">{employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee'}</h1>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                                    employee.isActive 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                    {employee.isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                    {employee.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                                    <Shield className="h-4 w-4" />
                                    {ROLE_LABELS[employee.role] ?? employee.role ?? 'N/A'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <Mail className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                <span>{employee.email ?? 'N/A'}</span>
                            </div>
                            {employee.phone && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Phone className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                    <span>{employee.phone}</span>
                                </div>
                            )}
                            {employee.address && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                    <span>{employee.address}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-shrink-0 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {attendance?.stats?.monthly?.presentRate ?? 0}%
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">Monthly Attendance</p>
                        </div>
                        {employee.role === 'Sales' && profile.salesKPIs ? (
                            <>
                                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {profile.salesKPIs.openOrders ?? 0}
                                    </p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300">Open Orders</p>
                                </div>
                                <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-4 text-center">
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        {profile.salesKPIs.tasksCompleted ?? 0}
                                    </p>
                                    <p className="text-xs text-purple-700 dark:text-purple-300">Tasks Completed</p>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {workOrders?.stats?.completionRate ?? 0}%
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">Task Completion</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="border-b border-[hsl(var(--border))]">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                {activeTab === 'info' && (
                    <div className="space-y-6 pb-8">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <User className="h-5 w-5 text-[hsl(var(--primary))]" />
                            Employee Information
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">First Name</label>
                                <p className="text-base">{employee.firstName || '—'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Last Name</label>
                                <p className="text-base">{employee.lastName || '—'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Email</label>
                                <p className="text-base">{employee.email || '—'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Phone</label>
                                <p className="text-base">{employee.phone || '—'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Employee ID</label>
                                <p className="text-base font-mono">{employee.employeeId || '—'}</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Address</label>
                                <p className="text-base">{employee.address || '—'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Role</label>
                                <p className="text-base">{ROLE_LABELS[employee.role] ?? employee.role ?? 'N/A'}</p>
                            </div>

                            {/* Commission & Discount Rates */}
                            <div className="md:col-span-2 border-t border-[hsl(var(--border))] pt-6 mt-2">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        Performance & Commission Rates
                                    </h3>
                                    {canEdit && !editingRates && !effectivelyReadOnly && (
                                        <button 
                                            onClick={() => {
                                                setRatesForm({
                                                    commissionPercentage: employee.commissionPercentage || 0,
                                                    maxDiscountPercentage: employee.maxDiscountPercentage || 0,
                                                });
                                                setEditingRates(true);
                                            }}
                                            className="text-xs font-bold text-[hsl(var(--primary))] hover:underline"
                                        >
                                            Edit Rates
                                        </button>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                            Default Commission %
                                        </label>
                                        {editingRates ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={ratesForm.commissionPercentage}
                                                    onChange={(e) => setRatesForm(prev => ({ ...prev, commissionPercentage: Number(e.target.value) }))}
                                                    className={inputClass}
                                                    min="0"
                                                    max="100"
                                                />
                                                <span className="font-bold text-[hsl(var(--muted-foreground))]">%</span>
                                            </div>
                                        ) : (
                                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                                {employee.commissionPercentage || 0}%
                                            </p>
                                        )}
                                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic">
                                            Used as the default rate in Order Finance.
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                            Max Discount Allowed %
                                        </label>
                                        {editingRates ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={ratesForm.maxDiscountPercentage}
                                                    onChange={(e) => setRatesForm(prev => ({ ...prev, maxDiscountPercentage: Number(e.target.value) }))}
                                                    className={inputClass}
                                                    min="0"
                                                    max="100"
                                                />
                                                <span className="font-bold text-[hsl(var(--muted-foreground))]">%</span>
                                            </div>
                                        ) : (
                                            <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                                                {employee.maxDiscountPercentage || 0}%
                                            </p>
                                        )}
                                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic">
                                            Enforced during quotation generation.
                                        </p>
                                    </div>
                                </div>

                                {editingRates && (
                                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[hsl(var(--border))] border-dashed">
                                        <button
                                            onClick={() => setEditingRates(false)}
                                            className="px-4 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50 rounded-lg transition-all"
                                            disabled={savingRates}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpdateRates}
                                            disabled={savingRates}
                                            className="px-6 py-2 text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg shadow-lg shadow-[hsl(var(--primary))]/20 flex items-center gap-2 transition-all hover:opacity-90"
                                        >
                                            {savingRates && <Loader2 className="h-3 w-3 animate-spin" />}
                                            Save Rates
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Joined</label>
                                <p className="text-base">
                                    {employee.createdAt && !isNaN(new Date(employee.createdAt).getTime())
                                        ? new Date(employee.createdAt).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric',
                                        })
                                        : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="space-y-6 pb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-[hsl(var(--primary))]" />
                                Attendance History
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4">
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">Monthly Present</p>
                                <p className="text-2xl font-bold">{attendance?.stats?.monthly?.breakdown?.['Present'] ?? 0}</p>
                            </div>
                            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4">
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">Monthly Absent</p>
                                <p className="text-2xl font-bold">{attendance?.stats?.monthly?.breakdown?.['Absent'] ?? 0}</p>
                            </div>
                            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4">
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">Monthly Late</p>
                                <p className="text-2xl font-bold">{attendance?.stats?.monthly?.breakdown?.['Late'] ?? 0}</p>
                            </div>
                            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4">
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">Monthly Leaves</p>
                                <p className="text-2xl font-bold">{attendance?.stats?.monthly?.breakdown?.['Leave'] ?? 0}</p>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto custom-table-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="bg-[hsl(var(--muted))]/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium">Date</th>
                                        <th className="px-4 py-3 text-left font-medium">Day</th>
                                        <th className="px-4 py-3 text-left font-medium">Check In</th>
                                        <th className="px-4 py-3 text-left font-medium">Check Out</th>
                                        <th className="px-4 py-3 text-left font-medium">Status</th>
                                        <th className="px-4 py-3 text-left font-medium">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[hsl(var(--border))]">
                                    {attendance?.records?.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">
                                                No attendance records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        attendance?.records?.slice(0, 20).map((record) => (
                                            <tr key={record?._id ?? 'att'} className="hover:bg-[hsl(var(--muted))]/30">
                                                <td className="px-4 py-3">
                                                    {record?.date && !isNaN(new Date(record.date).getTime())
                                                        ? new Date(record.date).toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3">{record?.day || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                        {record?.checkIn ? (
                                                            <>
                                                                <Clock className="h-3 w-3" />
                                                                {record.checkIn}
                                                            </>
                                                        ) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                                        {record?.checkOut ? (
                                                            <>
                                                                <Clock className="h-3 w-3" />
                                                                {record.checkOut}
                                                            </>
                                                        ) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[record?.status ?? ''] || 'bg-gray-100 text-gray-600'}`}>
                                                        {record?.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 max-w-[200px] truncate" title={record?.notes}>
                                                    {record?.notes || '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'tasks' && (
                    <div className="space-y-6 pb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-[hsl(var(--primary))]" />
                                Tasks & Performance
                            </h2>
                        </div>

                        {employee.role === 'Sales' && profile.salesKPIs ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        <p className="text-sm text-blue-700 dark:text-blue-300">Open Orders</p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {profile.salesKPIs.openOrders ?? 0}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        <p className="text-sm text-green-700 dark:text-green-300">Tasks Completed</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {profile.salesKPIs.tasksCompleted ?? 0}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        <p className="text-sm text-purple-700 dark:text-purple-300">Target Sales</p>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        EGP {(profile.salesKPIs.targetSales ?? 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        <p className="text-sm text-amber-700 dark:text-amber-300">Progress</p>
                                    </div>
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                        {(() => {
                                            const achieved = profile.salesKPIs?.achievedAmount ?? salesPerformance?.achievedAmount ?? 0;
                                            const target = profile.salesKPIs?.targetSales ?? salesPerformance?.targetAmount ?? 0;
                                            return target > 0 ? Math.round((achieved / target) * 100) : 0;
                                        })()}%
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        <p className="text-sm text-indigo-700 dark:text-indigo-300">Total Tasks</p>
                                    </div>
                                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {workOrders?.stats?.total ?? 0}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        <p className="text-sm text-green-700 dark:text-green-300">Completed</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {workOrders?.stats?.completed ?? 0}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        <p className="text-sm text-purple-700 dark:text-purple-300">Completion Rate</p>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        {workOrders?.stats?.completionRate ?? 0}%
                                    </p>
                                </div>
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        <p className="text-sm text-amber-700 dark:text-amber-300">Punctuality</p>
                                    </div>
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                        {workOrders?.stats?.punctualityRate ?? 0}%
                                    </p>
                                </div>
                            </div>
                        )}

                        {employee.role === 'Sales' && (
                            <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300">
                                        Sales Target Progress
                                    </h3>
                                </div>

                                {loadingSalesPerformance ? (
                                    <div className="flex items-center justify-center py-8 text-[hsl(var(--muted-foreground))]">
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        <span className="text-sm">Loading sales performance...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(() => {
                                            const achieved = profile.salesKPIs?.achievedAmount ?? salesPerformance?.achievedAmount ?? 0;
                                            const target = profile.salesKPIs?.targetSales ?? salesPerformance?.targetAmount ?? 0;
                                            const progress = target > 0 ? Math.round((achieved / target) * 100) : 0;
                                            
                                            return (
                                                <>
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">Achieved</p>
                                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                                EGP {achieved.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">Target</p>
                                                            <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                                                                EGP {target.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm font-semibold text-blue-700 dark:text-blue-400">
                                                            <span>Progress</span>
                                                            <span title="Based on Accepted/Won orders only">{progress}%</span>
                                                        </div>
                                                        <Progress 
                                                            value={progress} 
                                                            max={100}
                                                            className="h-3 bg-blue-100 dark:bg-blue-900"
                                                            indicatorClassName="bg-blue-600 dark:bg-blue-400"
                                                        />
                                                    </div>
                                                </>
                                            );
                                        })()}
                                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                                            Current Month Performance
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {employee.role === 'Sales' && profile.salesKPIs?.salesOrders ? (
                            <div className="w-full overflow-x-auto custom-table-scrollbar">
                                <table className="w-full text-sm">
                                    <thead className="bg-[hsl(var(--muted))]/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Customer</th>
                                            <th className="px-4 py-3 text-left font-medium">Type</th>
                                            <th className="px-4 py-3 text-left font-medium">Stage</th>
                                            <th className="px-4 py-3 text-left font-medium">Amount</th>
                                            <th className="px-4 py-3 text-left font-medium">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[hsl(var(--border))]">
                                        {profile.salesKPIs.salesOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">
                                                    No sales orders found.
                                                </td>
                                            </tr>
                                        ) : (
                                            profile.salesKPIs.salesOrders.slice(0, 20).map((order) => {
                                                const firstFollowUp = order.quotationStatusFirstFollowUp;
                                                const secondFollowUp = order.statusSecondFollowUp;
                                                const thirdFollowUp = order.finalStatusThirdFollowUp;
                                                
                                                let currentStage = 'New';
                                                let stageClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                                                
                                                if (thirdFollowUp && thirdFollowUp !== '') {
                                                    if (thirdFollowUp === 'Accepted') {
                                                        currentStage = 'Won';
                                                        stageClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                                                    } else if (thirdFollowUp === 'Not Potential') {
                                                        currentStage = 'Not Potential';
                                                        stageClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                                                    } else {
                                                        currentStage = '3rd Follow-up';
                                                        stageClass = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                                                    }
                                                } else if (secondFollowUp && secondFollowUp !== '') {
                                                    currentStage = '2nd Follow-up';
                                                    stageClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
                                                } else if (firstFollowUp && firstFollowUp !== '') {
                                                    currentStage = '1st Follow-up';
                                                    stageClass = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
                                                }
                                                
                                                return (
                                                    <tr key={order._id} className="hover:bg-[hsl(var(--muted))]/30">
                                                        <td className="px-4 py-3 font-medium">{order.customer?.name || '—'}</td>
                                                        <td className="px-4 py-3">{order.typeOfOrder || order.salesDataTypeOfOrder || 'General'}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${stageClass}`}>
                                                                {currentStage}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-green-600 dark:text-green-400">
                                                            EGP {(order.quotation?.grandTotal || 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {order.createdAt && !isNaN(new Date(order.createdAt).getTime())
                                                                ? new Date(order.createdAt).toLocaleDateString('en-GB')
                                                                : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="w-full overflow-x-auto custom-table-scrollbar">
                                <table className="w-full text-sm">
                                    <thead className="bg-[hsl(var(--muted))]/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Customer</th>
                                            <th className="px-4 py-3 text-left font-medium">Issue</th>
                                            <th className="px-4 py-3 text-left font-medium">Punctuality</th>
                                            <th className="px-4 py-3 text-left font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[hsl(var(--border))]">
                                        {workOrders?.records?.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">
                                                    No work orders found.
                                                </td>
                                            </tr>
                                        ) : (
                                            workOrders?.records?.slice(0, 20).map((wo) => (
                                                <tr key={wo?._id ?? 'wo'} className="hover:bg-[hsl(var(--muted))]/30">
                                                    <td className="px-4 py-3 font-medium">{wo?.customerOrderId?.customerId?.name || '—'}</td>
                                                    <td className="px-4 py-3 truncate max-w-[200px]">{wo?.customerOrderId?.issue || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                            wo?.punctuality === 'On Time' 
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                            {wo?.punctuality || 'Delayed'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                            wo?.taskCompleted === 'Yes' 
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                            {wo?.taskCompleted || 'No'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="space-y-6 pb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FileText className="h-5 w-5 text-[hsl(var(--primary))]" />
                                Documents
                            </h2>
                        </div>

                        {canEdit && (
                            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4">
                                <h3 className="text-sm font-semibold mb-3">Upload New Document</h3>
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                                            Document Title
                                        </label>
                                        <input
                                            type="text"
                                            value={docTitle}
                                            onChange={(e) => setDocTitle(e.target.value)}
                                            placeholder="e.g., Employment Contract"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                                            File (PDF, Images, DOC)
                                        </label>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                                            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <button
                                        onClick={handleDocumentUpload}
                                        disabled={uploadingDoc || !docTitle.trim() || !docFile}
                                        className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
                                    >
                                        <Upload className="h-4 w-4" />
                                        {uploadingDoc ? 'Uploading...' : 'Upload'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(!employee.documents || employee.documents.length === 0) ? (
                                <div className="col-span-full text-center py-8 text-[hsl(var(--muted-foreground))]">
                                    No documents uploaded yet.
                                </div>
                            ) : (
                                employee.documents.map((doc) => (
                                    <div
                                        key={doc?._id ?? `doc-${Math.random()}`}
                                        className="rounded-xl border border-[hsl(var(--border))] p-4 hover:bg-[hsl(var(--muted))]/30 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className="rounded-lg bg-[hsl(var(--primary))]/10 p-2">
                                                    <FileText className="h-6 w-6 text-[hsl(var(--primary))]" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{doc?.title ?? 'Untitled'}</h4>
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                                        Uploaded {doc?.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-GB') : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <a
                                                    href={doc?.fileUrl ?? '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-lg p-2 hover:bg-[hsl(var(--secondary))] transition-colors"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => doc?._id && handleDocumentDelete(doc._id)}
                                                        className="rounded-lg p-2 hover:bg-red-100 text-red-600 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
