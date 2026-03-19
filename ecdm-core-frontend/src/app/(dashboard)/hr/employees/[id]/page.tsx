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

// ─── Types ──────────────────────────────────────────────────────────────────────
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
    
    // Sales Performance State
    const [salesPerformance, setSalesPerformance] = useState<{
        targetAmount: number;
        achievedAmount: number;
        progressPercentage: number;
        month: number;
        year: number;
    } | null>(null);
    const [loadingSalesPerformance, setLoadingSalesPerformance] = useState(false);
    
    // Document upload state
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docTitle, setDocTitle] = useState('');
    const [docFile, setDocFile] = useState<File | null>(null);

    const canEdit = user?.role && ['SuperAdmin', 'Manager', 'HR'].includes(user.role);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await api.get(`/hr/users/${employeeId}/profile`);
                setProfile(data.data);

                // Fetch sales performance if employee is in Sales role
                if (data.data?.employee?.role === 'Sales') {
                    fetchSalesPerformance();
                }
            } catch (err) {
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
                setSalesPerformance(data.data);
            } catch (err) {
                console.error('Failed to fetch sales performance:', err);
                // Silently fail - not all sales users may have targets set
            } finally {
                setLoadingSalesPerformance(false);
            }
        };

        fetchProfile();
    }, [employeeId]);

    const handleDocumentUpload = async () => {
        if (!docTitle.trim() || !docFile) {
            toast.error('Please enter a title and select a file');
            return;
        }

        setUploadingDoc(true);
        try {
            const formData = new FormData();
            formData.append('title', docTitle);
            formData.append('document', docFile);

            const { data } = await api.post(`/hr/users/${employeeId}/documents/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setProfile(prev => prev ? { ...prev, employee: data.data.item } : null);
            toast.success('Document uploaded successfully');
            setDocTitle('');
            setDocFile(null);
        } catch {
            toast.error('Failed to upload document');
        }
        setUploadingDoc(false);
    };

    const handleDocumentDelete = async (docId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            const { data } = await api.delete(`/hr/users/${employeeId}/documents/${docId}`);
            setProfile(prev => prev ? { ...prev, employee: data.data.item } : null);
            toast.success('Document deleted');
        } catch {
            toast.error('Failed to delete document');
        }
    };

    // Tab configuration
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
        <div className="space-y-6">
            {/* Back button */}
            <Link
                href="/hr/users"
                className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Employees
            </Link>

            {/* Header Card */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="h-32 w-32 rounded-2xl bg-[hsl(var(--primary))]/10 flex items-center justify-center overflow-hidden">
                            {employee.avatarUrl ? (
                                <img src={employee.avatarUrl} alt={employee.fullName} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-4xl font-bold text-[hsl(var(--primary))]">
                                    {employee.firstName?.[0]}{employee.lastName?.[0]}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-4">
                        <div>
                            <h1 className="text-2xl font-bold">{employee.fullName}</h1>
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
                                    {ROLE_LABELS[employee.role] || employee.role}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                <span>{employee.email}</span>
                            </div>
                            {employee.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                    <span>{employee.phone}</span>
                                </div>
                            )}
                            {employee.address && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                    <span>{employee.address}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex-shrink-0 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {attendance.stats.monthly.presentRate}%
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">Monthly Attendance</p>
                        </div>
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {workOrders.stats.completionRate}%
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">Task Completion</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
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

            {/* Tab Content */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                {/* Profile Info Tab */}
                {activeTab === 'info' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <User className="h-5 w-5 text-[hsl(var(--primary))]" />
                            Employee Information
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">First Name</label>
                                <p className="text-base">{employee.firstName}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Last Name</label>
                                <p className="text-base">{employee.lastName}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Email</label>
                                <p className="text-base">{employee.email}</p>
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
                                <p className="text-base">{ROLE_LABELS[employee.role] || employee.role}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Joined</label>
                                <p className="text-base">
                                    {new Date(employee.createdAt).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-[hsl(var(--primary))]" />
                                Attendance History
                            </h2>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4">
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">Monthly Present</p>
                                <p className="text-2xl font-bold">{attendance.stats.monthly.breakdown['Present'] || 0}</p>
                            </div>
                            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4">
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">Monthly Absent</p>
                                <p className="text-2xl font-bold">{attendance.stats.monthly.breakdown['Absent'] || 0}</p>
                            </div>
                            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4">
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">Monthly Late</p>
                                <p className="text-2xl font-bold">{attendance.stats.monthly.breakdown['Late'] || 0}</p>
                            </div>
                            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4">
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">Monthly Leaves</p>
                                <p className="text-2xl font-bold">{attendance.stats.monthly.breakdown['Leave'] || 0}</p>
                            </div>
                        </div>

                        {/* Attendance Table */}
                        <div className="overflow-x-auto">
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
                                    {attendance.records.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">
                                                No attendance records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        attendance.records.slice(0, 20).map((record) => (
                                            <tr key={record._id} className="hover:bg-[hsl(var(--muted))]/30">
                                                <td className="px-4 py-3">
                                                    {new Date(record.date).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-4 py-3">{record.day || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                        {record.checkIn ? (
                                                            <>
                                                                <Clock className="h-3 w-3" />
                                                                {record.checkIn}
                                                            </>
                                                        ) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                                        {record.checkOut ? (
                                                            <>
                                                                <Clock className="h-3 w-3" />
                                                                {record.checkOut}
                                                            </>
                                                        ) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[record.status] || 'bg-gray-100 text-gray-600'}`}>
                                                        {record.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 max-w-[200px] truncate" title={record.notes}>
                                                    {record.notes || '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tasks Tab */}
                {activeTab === 'tasks' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-[hsl(var(--primary))]" />
                                Tasks & Performance
                            </h2>
                        </div>

                        {/* Performance Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300">Total Tasks</p>
                                </div>
                                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {workOrders.stats.total}
                                </p>
                            </div>
                            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    <p className="text-sm text-green-700 dark:text-green-300">Completed</p>
                                </div>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {workOrders.stats.completed}
                                </p>
                            </div>
                            <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    <p className="text-sm text-purple-700 dark:text-purple-300">Completion Rate</p>
                                </div>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {workOrders.stats.completionRate}%
                                </p>
                            </div>
                            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    <p className="text-sm text-amber-700 dark:text-amber-300">Punctuality</p>
                                </div>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {workOrders.stats.punctualityRate}%
                                </p>
                            </div>
                        </div>

                        {/* Sales Performance Widget - Only for Sales role */}
                        {employee.role === 'Sales' && (
                            <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300">
                                        Monthly Sales Target Progress
                                    </h3>
                                </div>

                                {loadingSalesPerformance ? (
                                    <div className="flex items-center justify-center py-8 text-[hsl(var(--muted-foreground))]">
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        <span className="text-sm">Loading sales performance...</span>
                                    </div>
                                ) : salesPerformance ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Achieved</p>
                                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    EGP {salesPerformance.achievedAmount.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Target</p>
                                                <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                                                    EGP {salesPerformance.targetAmount.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm font-semibold text-blue-700 dark:text-blue-400">
                                                <span>Progress</span>
                                                <span>{salesPerformance.progressPercentage}%</span>
                                            </div>
                                            <Progress 
                                                value={salesPerformance.progressPercentage} 
                                                max={100}
                                                className="h-3 bg-blue-100 dark:bg-blue-900"
                                                indicatorClassName="bg-blue-600 dark:bg-blue-400"
                                            />
                                        </div>

                                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                                            {new Date(salesPerformance.year, salesPerformance.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} Performance
                                        </p>
                                    </div>
                                ) : (
                                    <div className="py-6 text-center">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">No sales target set for this month</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Contact management to set a target</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Marketing Budget Progress Widget - Only for Marketing role */}
                        {employee.role === 'Marketing' && (
                            <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-gray-900 p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                                        Monthly Marketing Budget Progress
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Spent / Achieved</p>
                                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                EGP 0
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Target Budget</p>
                                            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                                                EGP {(employee.targetBudget || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                            <span>Progress</span>
                                            <span>0%</span>
                                        </div>
                                        <Progress
                                            value={0}
                                            max={100}
                                            className="h-3 bg-emerald-100 dark:bg-emerald-900"
                                            indicatorClassName="bg-emerald-500 dark:bg-emerald-400"
                                        />
                                    </div>

                                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800">
                                        {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Performance
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Work Orders Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[hsl(var(--muted))]/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium">Customer</th>
                                        <th className="px-4 py-3 text-left font-medium">Issue</th>
                                        <th className="px-4 py-3 text-left font-medium">Type</th>
                                        <th className="px-4 py-3 text-left font-medium">Date</th>
                                        <th className="px-4 py-3 text-left font-medium">Punctuality</th>
                                        <th className="px-4 py-3 text-left font-medium">Completed</th>
                                        <th className="px-4 py-3 text-left font-medium">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[hsl(var(--border))]">
                                    {workOrders.records.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">
                                                No work orders found.
                                            </td>
                                        </tr>
                                    ) : (
                                        workOrders.records.slice(0, 20).map((wo) => (
                                            <tr key={wo._id} className="hover:bg-[hsl(var(--muted))]/30">
                                                <td className="px-4 py-3 font-medium">
                                                    {wo.customerOrderId?.customerId?.name || '—'}
                                                </td>
                                                <td className="px-4 py-3 max-w-[200px] truncate">
                                                    {wo.customerOrderId?.issue || '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {wo.customerOrderId?.typeOfOrder || '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {wo.taskDate 
                                                        ? new Date(wo.taskDate).toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })
                                                        : '—'
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                        wo.punctuality === 'On Time' 
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : wo.punctuality === 'Delayed'
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {wo.punctuality || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                        wo.taskCompleted === 'Yes' 
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : wo.taskCompleted === 'No'
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {wo.taskCompleted || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">{wo.rating || '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FileText className="h-5 w-5 text-[hsl(var(--primary))]" />
                                Documents
                            </h2>
                        </div>

                        {/* Upload Form (if authorized) */}
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

                        {/* Documents List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(!employee.documents || employee.documents.length === 0) ? (
                                <div className="col-span-full text-center py-8 text-[hsl(var(--muted-foreground))]">
                                    No documents uploaded yet.
                                </div>
                            ) : (
                                employee.documents.map((doc) => (
                                    <div
                                        key={doc._id}
                                        className="rounded-xl border border-[hsl(var(--border))] p-4 hover:bg-[hsl(var(--muted))]/30 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className="rounded-lg bg-[hsl(var(--primary))]/10 p-2">
                                                    <FileText className="h-6 w-6 text-[hsl(var(--primary))]" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{doc.title}</h4>
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <a
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-lg p-2 hover:bg-[hsl(var(--secondary))] transition-colors"
                                                    title="View"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleDocumentDelete(doc._id)}
                                                        className="rounded-lg p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                                                        title="Delete"
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
