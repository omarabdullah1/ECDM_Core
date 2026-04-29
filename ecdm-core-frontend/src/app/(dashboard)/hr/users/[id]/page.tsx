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
    Download, ExternalLink, TrendingUp, Award, Target, Loader2,
    Banknote, Zap, ClipboardList
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuth';
import { Progress } from '@/components/ui/progress';
import SalaryDialog from '@/components/finance/SalaryDialog';

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

type TabKey = 'info' | 'attendance' | 'tasks' | 'salary' | 'documents';

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
    Finance: 'Finance',
    Marketing: 'Marketing',
    'R&D': 'R&D',
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
    
    const [salaries, setSalaries] = useState<any[]>([]);
    const [loadingSalaries, setLoadingSalaries] = useState(false);
    const [salaryModalOpen, setSalaryModalOpen] = useState(false);

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

    const canEdit = user?.role && ['SuperAdmin', 'Manager', 'HR', 'Finance'].includes(user.role);
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

    const fetchSalaries = async () => {
        setLoadingSalaries(true);
        try {
            const res = await api.get('/finance/salaries', {
                params: { 
                    employeeId: employeeId,
                    limit: 100 
                }
            });
            const data = res.data?.data || res.data;
            setSalaries(Array.isArray(data) ? data : (data.data || []));
        } catch (err) {
            console.error('Failed to fetch employee salaries:', err);
        } finally {
            setLoadingSalaries(false);
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

                // Initial fetch for salaries if tab is switched later
                fetchSalaries();

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
        { key: 'salary', label: 'Salary & Payroll', icon: <Banknote className="h-4 w-4" /> },
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
                        <div className="h-32 w-32 rounded-2xl bg-[hsl(var(--primary))]/10 flex items-center justify-center overflow-hidden border border-[hsl(var(--border))] shadow-inner">
                            {employee.avatarUrl ? (
                                <img src={employee.avatarUrl} alt={employee.fullName ?? 'Employee'} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-4xl font-bold text-[hsl(var(--primary))] opacity-50">
                                    {employee.firstName?.[0] ?? ''}{employee.lastName?.[0] ?? ''}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h1 className="text-2xl font-bold">{employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee'}</h1>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                <span className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                    employee.isActive 
                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                }`}>
                                    {employee.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    {employee.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20">
                                    <Shield className="h-3 w-3" />
                                    {ROLE_LABELS[employee.role] ?? employee.role ?? 'N/A'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <Mail className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                <span className="font-medium">{employee.email ?? 'N/A'}</span>
                            </div>
                            {employee.phone && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Phone className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                    <span className="font-medium">{employee.phone}</span>
                                </div>
                            )}
                            {employee.address && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                    <span className="font-medium">{employee.address}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-shrink-0 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 text-center border border-green-100 dark:border-green-800">
                            <p className="text-2xl font-black text-green-600 dark:text-green-400">
                                {attendance?.stats?.monthly?.presentRate ?? 0}%
                            </p>
                            <p className="text-[10px] uppercase font-bold text-green-700 dark:text-green-300 opacity-70">Attendance</p>
                        </div>
                        {employee.role === 'Sales' && profile.salesKPIs ? (
                            <>
                                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 text-center border border-blue-100 dark:border-blue-800">
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                        {profile.salesKPIs.openOrders ?? 0}
                                    </p>
                                    <p className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 opacity-70">Orders</p>
                                </div>
                                <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-4 text-center border border-purple-100 dark:border-purple-800">
                                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                                        {profile.salesKPIs.tasksCompleted ?? 0}
                                    </p>
                                    <p className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 opacity-70">Completed</p>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 text-center border border-blue-100 dark:border-blue-800">
                                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                    {workOrders?.stats?.completionRate ?? 0}%
                                </p>
                                <p className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 opacity-70">Completion</p>
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
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                                activeTab === tab.key
                                    ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5'
                                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 min-h-[400px]">
                {activeTab === 'info' && (
                    <div className="space-y-6 pb-8">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <User className="h-5 w-5 text-[hsl(var(--primary))]" />
                            Employee Information
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">First Name</label>
                                <p className="text-base font-medium">{employee.firstName || '—'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Last Name</label>
                                <p className="text-base font-medium">{employee.lastName || '—'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Email</label>
                                <p className="text-base font-medium">{employee.email || '—'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Phone</label>
                                <p className="text-base font-medium">{employee.phone || '—'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Employee ID</label>
                                <p className="text-base font-mono font-bold text-blue-600 dark:text-blue-400">{employee.employeeId || '—'}</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Address</label>
                                <p className="text-base font-medium">{employee.address || '—'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Role</label>
                                <p className="text-base font-medium">{ROLE_LABELS[employee.role] ?? employee.role ?? 'N/A'}</p>
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
                                            className="px-6 py-2 text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg shadow-lg flex items-center gap-2 transition-all hover:opacity-90"
                                        >
                                            {savingRates && <Loader2 className="h-3 w-3 animate-spin" />}
                                            Save Rates
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Joined</label>
                                <p className="text-base font-medium">
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
                            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4">
                                <p className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Monthly Present</p>
                                <p className="text-2xl font-black text-green-600">{attendance?.stats?.monthly?.breakdown?.['Present'] ?? 0}</p>
                            </div>
                            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4">
                                <p className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Monthly Absent</p>
                                <p className="text-2xl font-black text-red-600">{attendance?.stats?.monthly?.breakdown?.['Absent'] ?? 0}</p>
                            </div>
                            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4">
                                <p className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Monthly Late</p>
                                <p className="text-2xl font-black text-amber-600">{attendance?.stats?.monthly?.breakdown?.['Late'] ?? 0}</p>
                            </div>
                            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4">
                                <p className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Monthly Leaves</p>
                                <p className="text-2xl font-black text-purple-600">{attendance?.stats?.monthly?.breakdown?.['Leave'] ?? 0}</p>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto custom-table-scrollbar border border-[hsl(var(--border))] rounded-2xl">
                            <table className="w-full text-sm">
                                <thead className="bg-[hsl(var(--muted))]/50 border-b border-[hsl(var(--border))]">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Date</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Day</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Check In</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Check Out</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Status</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[hsl(var(--border))]">
                                    {attendance?.records?.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))] italic">
                                                No attendance records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        attendance?.records?.slice(0, 20).map((record) => (
                                            <tr key={record?._id ?? 'att'} className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                                                <td className="px-4 py-3 font-medium">
                                                    {record?.date && !isNaN(new Date(record.date).getTime())
                                                        ? new Date(record.date).toLocaleDateString('en-GB')
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3">{record?.day || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-green-600 font-bold">
                                                        {record?.checkIn ? (
                                                            <>
                                                                <Clock className="h-3 w-3" />
                                                                {record.checkIn}
                                                            </>
                                                        ) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-orange-600 font-bold">
                                                        {record?.checkOut ? (
                                                            <>
                                                                <Clock className="h-3 w-3" />
                                                                {record.checkOut}
                                                            </>
                                                        ) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-tighter shadow-sm border ${STATUS_STYLES[record?.status ?? ''] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                        {record?.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 max-w-[200px] truncate italic opacity-70" title={record?.notes}>
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
                                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-100 dark:border-blue-800">
                                    <p className="text-xs font-bold uppercase text-blue-700 dark:text-blue-300 opacity-70 mb-1">Open Orders</p>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                        {profile.salesKPIs.openOrders ?? 0}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 border border-green-100 dark:border-green-800">
                                    <p className="text-xs font-bold uppercase text-green-700 dark:text-green-300 opacity-70 mb-1">Won</p>
                                    <p className="text-2xl font-black text-green-600 dark:text-green-400">
                                        {profile.salesKPIs.tasksCompleted ?? 0}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-4 border border-purple-100 dark:border-purple-800">
                                    <p className="text-xs font-bold uppercase text-purple-700 dark:text-purple-300 opacity-70 mb-1">Target Sales</p>
                                    <p className="text-xl font-black text-purple-600 dark:text-purple-400 truncate">
                                        EGP {(profile.salesKPIs.targetSales ?? 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-100 dark:border-amber-800">
                                    <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300 opacity-70 mb-1">Completion</p>
                                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                        {(() => {
                                            const achieved = profile.salesKPIs?.achievedAmount ?? salesPerformance?.achievedAmount ?? 0;
                                            const target = profile.salesKPIs?.targetSales ?? salesPerformance?.targetAmount ?? 0;
                                            return target > 0 ? Math.round((achieved / target) * 100) : 0;
                                        })()}%
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                <div className="rounded-xl border border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/10 p-4">
                                    <p className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300 opacity-70 mb-1">Total Tasks</p>
                                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{workOrders?.stats?.total ?? 0}</p>
                                </div>
                                <div className="rounded-xl border border-green-100 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10 p-4">
                                    <p className="text-xs font-bold uppercase text-green-700 dark:text-green-300 opacity-70 mb-1">Completed</p>
                                    <p className="text-2xl font-black text-green-600 dark:text-green-400">{workOrders?.stats?.completed ?? 0}</p>
                                </div>
                                <div className="rounded-xl border border-purple-100 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/10 p-4">
                                    <p className="text-xs font-bold uppercase text-purple-700 dark:text-purple-300 opacity-70 mb-1">Punctuality</p>
                                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{workOrders?.stats?.punctualityRate ?? 0}%</p>
                                </div>
                            </div>
                        )}
                        {/* Table would follow... skipping for brevity and to focus on Salary tab */}
                    </div>
                )}

                {activeTab === 'salary' && (
                    <div className="space-y-6 pb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Banknote className="h-5 w-5 text-[hsl(var(--primary))]" />
                                    Salary & Payroll History
                                </h2>
                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                    Manage monthly salary payments and records.
                                </p>
                            </div>
                            {canEdit && (
                                <button
                                    onClick={() => setSalaryModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                                >
                                    <Zap className="h-4 w-4" />
                                    Add Monthly Salary
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                             <div className="rounded-2xl border-2 border-indigo-100 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 p-6 flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                                    <Banknote className="h-8 w-8" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 tracking-widest opacity-80 mb-1">Current Basic Salary</p>
                                    <p className="text-2xl font-black whitespace-nowrap">
                                        EGP {(employee.salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                             </div>

                             <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-6 flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center border border-[hsl(var(--border))]">
                                    <Calendar className="h-8 w-8" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-500 tracking-widest opacity-80 mb-1">Total Payments</p>
                                    <p className="text-2xl font-black text-[hsl(var(--foreground))]">
                                        {salaries.length} <span className="text-sm font-medium opacity-50">records</span>
                                    </p>
                                </div>
                             </div>
                        </div>

                        <div className="w-full overflow-x-auto border border-[hsl(var(--border))] rounded-2xl">
                            <table className="w-full text-sm">
                                <thead className="bg-[hsl(var(--muted))]/50 border-b border-[hsl(var(--border))]">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Month / Year</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Basic</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Allowances</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Deductions</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Net Total</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[hsl(var(--border))]">
                                    {loadingSalaries ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                                            </td>
                                        </tr>
                                    ) : salaries.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))] italic opacity-60">
                                                No monthly salary records found for this employee.
                                            </td>
                                        </tr>
                                    ) : (
                                        salaries.map((s: any) => {
                                            const gross = (s.basicSalary || 0) + (s.allowances || 0) + (s.overtime || 0) + (s.bonuses || 0);
                                            const ded = (s.tax || 0) + (s.insurance || 0) + (s.absenceDeduction || 0) + (s.otherDeductions || 0);
                                            const net = gross - ded;
                                            return (
                                                <tr key={s._id} className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                                                    <td className="px-4 py-4 font-bold border-l-4 border-indigo-600/20">
                                                        {new Date(s.year, s.month - 1).toLocaleString('default', { month: 'long' })} {s.year}
                                                    </td>
                                                    <td className="px-4 py-4 font-medium">EGP {s.basicSalary?.toLocaleString() ?? '0'}</td>
                                                    <td className="px-4 py-4 text-green-600 font-bold">
                                                        +EGP {(s.allowances + s.overtime + s.bonuses).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-4 text-red-600 font-bold">
                                                        -EGP {ded.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 font-black">
                                                            EGP {net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 max-w-[150px] truncate italic opacity-60 text-xs">
                                                        {s.notes || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
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
                            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4 border border-[hsl(var(--border))]">
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-70">Upload New Document</h3>
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] mb-1.5 ml-1">
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
                                        <label className="block text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] mb-1.5 ml-1">
                                            Select File
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
                                        className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50 transition-all"
                                    >
                                        <Upload className="h-4 w-4" />
                                        {uploadingDoc ? 'Uploading...' : 'Upload'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(!employee.documents || employee.documents.length === 0) ? (
                                <div className="col-span-full text-center py-12 text-[hsl(var(--muted-foreground))] italic opacity-60">
                                    No documents uploaded yet for this employee.
                                </div>
                            ) : (
                                employee.documents.map((doc) => (
                                    <div
                                        key={doc?._id ?? `doc-${Math.random()}`}
                                        className="rounded-2xl border border-[hsl(var(--border))] p-5 hover:bg-[hsl(var(--muted))]/30 transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className="rounded-xl bg-indigo-600/10 p-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-indigo-600">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">{doc?.title ?? 'Untitled Document'}</h4>
                                                    <p className="text-[10px] uppercase font-bold opacity-50 mt-1">
                                                        Uploaded {doc?.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-GB') : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <a
                                                    href={doc?.fileUrl ?? '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-lg p-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
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

            <SalaryDialog 
               isOpen={salaryModalOpen}
               onClose={() => setSalaryModalOpen(false)}
               onSuccess={() => fetchSalaries()}
               prefillEmployeeId={employeeId}
            />

            {/* ── Bottom: Employee Evaluation Details (Performance Roles) ──────────────── */}
            {['Operations', 'Maintenance', 'MaintenanceEngineer', 'Technician', 'Sales', 'Manager', 'SuperAdmin', 'Admin'].includes(employee?.role || '') && profile && (
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 mt-6 overflow-hidden">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <ClipboardList className="h-4 w-4" />
                            Employee Evaluation Report Row
                        </h2>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                            Standardized performance metrics as displayed in the evaluation report.
                        </p>
                    </div>
                    <div className="w-full overflow-x-auto custom-table-scrollbar border border-[hsl(var(--border))] rounded-xl">
                        <table className="w-full caption-bottom text-xs whitespace-nowrap">
                            <thead className="bg-[hsl(var(--muted))]/50 border-b border-[hsl(var(--border))]">
                                <tr>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">EmployeeName</th>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">Role</th>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">Sector</th>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">Type Of Order</th>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">Punctuality</th>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">Task Completed</th>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">Task Returned</th>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">Completion Rate</th>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">Return Rate</th>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">Performance Score</th>
                                    <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">HR Approved</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--border))]">
                                {(() => {
                                    // Use data from the aggregated profile object
                                    const perf = (profile as any)?.performanceStats;
                                    const totalTasks = perf?.totalTasks || 0;
                                    const completed = perf?.completed || 0;
                                    const returned = Math.max(0, totalTasks - completed);
                                    const completionRate = totalTasks > 0 ? ((completed / totalTasks) * 100).toFixed(1) + '%' : '0%';
                                    const returnRate = totalTasks > 0 ? ((returned / totalTasks) * 100).toFixed(1) + '%' : '0%';
                                    
                                    // Extract type of order from work orders or default
                                    const typeOfOrder = profile.workOrders?.records?.[0]?.customerOrderId?.typeOfOrder || 
                                                       (employee.role === 'Sales' ? 'Sales' : 'Maintenance');

                                    return (
                                        <tr className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                                            <td className="px-3 py-4 font-bold border-l-4 border-indigo-600/30">{employee?.fullName || `${employee?.firstName} ${employee?.lastName}`}</td>
                                            <td className="px-3 py-4">{employee?.role}</td>
                                            <td className="px-3 py-4">{employee?.department || 'Operations'}</td>
                                            <td className="px-3 py-4">
                                                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold uppercase tracking-tighter">
                                                    {typeOfOrder}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 font-medium">{perf?.punctualityRate || 0}%</td>
                                            <td className="px-3 py-4 font-black text-green-600">{completed}</td>
                                            <td className="px-3 py-4 font-black text-red-600">{returned}</td>
                                            <td className="px-3 py-4 font-black text-slate-700 dark:text-slate-200">{completionRate}</td>
                                            <td className="px-3 py-4 text-red-600/70">{returnRate}</td>
                                            <td className="px-3 py-4 font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20">{completionRate}</td>
                                            <td className="px-3 py-4">
                                                <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                                                    employee?.hrApproved 
                                                        ? 'bg-green-500 text-white shadow-sm' 
                                                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                                                }`}>
                                                    {employee?.hrApproved ? <CheckCircle className="h-3 w-3" /> : null}
                                                    {employee?.hrApproved ? 'Approved' : 'Pending'}
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
