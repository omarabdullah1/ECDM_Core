'use client';
import { useState, useEffect } from 'react';
import { Edit2, X, AlertCircle, Loader2, TrendingUp, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import PerformanceScoreCard from '@/components/profile/PerformanceScoreCard';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface User {
    _id: string;
    employeeId?: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    phone?: string;
    targetBudget?: number;
    targetSales?: number;
    maxDiscountPercentage?: number;
    commissionPercentage?: number;
    salary?: number;
    department?: string;
    workStartTime?: string;
    workEndTime?: string;
    gracePeriod?: number;
    halfDayThreshold?: number;
}

interface EditUserDialogProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialEditMode?: boolean;
}

const ROLES = [
    { value: 'SuperAdmin', label: 'Super Admin' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Operations', label: 'Operations' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'HR', label: 'HR' },
    { value: 'MaintenanceEngineer', label: 'Maintenance Engineer' },
    { value: 'Technician', label: 'Technician' },
    { value: 'CustomerService', label: 'Customer Service' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'R&D', label: 'R&D' },
    { value: 'Finance', label: 'Finance' },
] as const;

const DEPARTMENTS = [
    'Engineering',
    'Sales',
    'Marketing',
    'HR',
    'Finance',
    'Operations',
    'Other'
];

const inputClass = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed';

export default function EditUserDialog({ user, isOpen, onClose, onSuccess, initialEditMode = false }: EditUserDialogProps) {
    const [internalPreviewMode, setInternalPreviewMode] = useState(!initialEditMode);

    useEffect(() => {
        if (isOpen) {
            setInternalPreviewMode(!initialEditMode);
        }
    }, [isOpen, initialEditMode]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '',
        role: user.role || '',
        phone: user.phone || '',
        isActive: user.isActive ?? true,
        maxDiscountPercentage: user.maxDiscountPercentage || 0,
        commissionPercentage: user.commissionPercentage || 0,
        salary: user.salary || 0,
        department: user.department || '',
        workStartTime: user.workStartTime || '09:00',
        workEndTime: user.workEndTime || '17:00',
        gracePeriod: user.gracePeriod !== undefined ? user.gracePeriod : 15,
        halfDayThreshold: user.halfDayThreshold !== undefined ? user.halfDayThreshold : 4.5,
        targetSales: user.targetSales || 0,
        targetBudget: user.targetBudget || 0,
    });

    const [performanceStats, setPerformanceStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        if (isOpen && user._id) {
            const fetchStats = async () => {
                setLoadingStats(true);
                try {
                    const { data } = await api.get(`/hr/users/${user._id}/profile`);
                    setPerformanceStats(data.data?.performanceStats || data.performanceStats || null);
                } catch (err) {
                    console.error('Failed to fetch performance stats:', err);
                } finally {
                    setLoadingStats(false);
                }
            };
            fetchStats();
        }
    }, [isOpen, user._id]);

    const effectivelyReadOnly = internalPreviewMode;

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const payload: any = {
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                role: form.role,
                phone: form.phone,
                isActive: form.isActive,
                maxDiscountPercentage: form.maxDiscountPercentage,
                commissionPercentage: form.commissionPercentage,
                salary: Number(form.salary),
                department: form.department,
                workStartTime: form.workStartTime,
                workEndTime: form.workEndTime,
                gracePeriod: Number(form.gracePeriod),
                halfDayThreshold: Number(form.halfDayThreshold),
                targetSales: Number(form.targetSales),
                targetBudget: Number(form.targetBudget),
            };
            if (form.password) {
                payload.password = form.password;
            }

            await api.put(`/auth/users/${user._id}`, payload);
            toast.success('User updated successfully');
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update user');
        }
        setSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <Edit2 className="h-6 w-6 text-[hsl(var(--primary))]" />
                        <DialogTitle>
                            {effectivelyReadOnly ? 'User Preview' : 'Edit Employee'}
                        </DialogTitle>
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                        {effectivelyReadOnly ? 'Viewing user account details' : 'Modify employee permissions and profile information'}
                        {effectivelyReadOnly && <span className="ml-2 text-amber-600 font-semibold">• Preview Mode</span>}
                    </p>
                </DialogHeader>

                <DialogBody>
                    <div className="mb-6">
                        <PerformanceScoreCard stats={performanceStats} loading={loadingStats} />
                    </div>
                    <form id="edit-user-form" onSubmit={handleUpdate} className="space-y-4 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">First Name</label>
                                <input
                                    type="text"
                                    value={form.firstName}
                                    onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Last Name</label>
                                <input
                                    type="text"
                                    value={form.lastName}
                                    onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                className={inputClass}
                                disabled={effectivelyReadOnly}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Role</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                    required
                                >
                                    {ROLES.map(role => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Phone</label>
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    Department
                                </label>
                                <select
                                    value={form.department}
                                    onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                >
                                    <option value="">Select Department</option>
                                    {DEPARTMENTS.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Basic Salary (EGP)</label>
                                <input
                                    type="number"
                                    value={form.salary}
                                    onChange={(e) => setForm(prev => ({ ...prev, salary: Number(e.target.value) }))}
                                    min="0"
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Shift Start Time</label>
                                <input
                                    type="time"
                                    value={form.workStartTime}
                                    onChange={(e) => setForm(prev => ({ ...prev, workStartTime: e.target.value }))}
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Shift End Time</label>
                                <input
                                    type="time"
                                    value={form.workEndTime}
                                    onChange={(e) => setForm(prev => ({ ...prev, workEndTime: e.target.value }))}
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Grace Period (Min)</label>
                                <input
                                    type="number"
                                    value={form.gracePeriod}
                                    onChange={(e) => setForm(prev => ({ ...prev, gracePeriod: Number(e.target.value) }))}
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Half-day (Hrs)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={form.halfDayThreshold}
                                    onChange={(e) => setForm(prev => ({ ...prev, halfDayThreshold: Number(e.target.value) }))}
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    Commission %
                                </label>
                                <input
                                    type="number"
                                    value={form.commissionPercentage}
                                    onChange={(e) => setForm(prev => ({ ...prev, commissionPercentage: Number(e.target.value) }))}
                                    min="0"
                                    max="100"
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Max Discount %</label>
                                <input
                                    type="number"
                                    value={form.maxDiscountPercentage}
                                    onChange={(e) => setForm(prev => ({ ...prev, maxDiscountPercentage: Number(e.target.value) }))}
                                    min="0"
                                    max="100"
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                                    Target Sales (EGP)
                                </label>
                                <input
                                    type="number"
                                    value={form.targetSales}
                                    onChange={(e) => setForm(prev => ({ ...prev, targetSales: Number(e.target.value) }))}
                                    min="0"
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                    placeholder="Enter sales target"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3 text-blue-500" />
                                    Target Budget (EGP)
                                </label>
                                <input
                                    type="number"
                                    value={form.targetBudget}
                                    onChange={(e) => setForm(prev => ({ ...prev, targetBudget: Number(e.target.value) }))}
                                    min="0"
                                    className={inputClass}
                                    disabled={effectivelyReadOnly}
                                    placeholder="Enter budget target"
                                />
                            </div>
                        </div>


                        {!effectivelyReadOnly && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">
                                    Password <span className="lowercase text-xs opacity-70">(leave blank to keep current)</span>
                                </label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="Enter new password"
                                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all"
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={form.isActive}
                                onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                className="h-4 w-4 rounded border-[hsl(var(--border))]"
                                disabled={effectivelyReadOnly}
                            />
                            <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                                Active Account
                            </label>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}
                    </form>
                </DialogBody>

                <DialogFooter>
                    <div className="flex gap-3 w-full">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-[hsl(var(--border))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))] transition-colors"
                        >
                            {effectivelyReadOnly ? 'Close' : 'Cancel'}
                        </button>
                        {effectivelyReadOnly ? (
                            <button
                                type="button"
                                key="btn-edit" onClick={(e) => { e.preventDefault(); setInternalPreviewMode(false); }}
                                className="flex-1 rounded-xl bg-blue-600 text-white py-3 text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Edit2 className="h-4 w-4" />
                                Edit Account
                            </button>
                        ) : (
                            <button
                                type="submit"
                                form="edit-user-form"
                                disabled={saving}
                                className="flex-1 rounded-xl bg-[hsl(var(--primary))] text-white py-3 text-sm font-semibold disabled:opacity-60 transition-all flex items-center justify-center gap-2 protect-mount"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {saving ? 'Saving...' : 'Update Account'}
                            </button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

