'use client';
import { useState } from 'react';
import { Edit2, X, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
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
}

interface EditUserDialogProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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
] as const;

const inputClass = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed';

export default function EditUserDialog({ user, isOpen, onClose, onSuccess }: EditUserDialogProps) {
    const [internalPreviewMode, setInternalPreviewMode] = useState(true);
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
    });

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
                    <form id="edit-user-form" onSubmit={handleUpdate} className="space-y-4">
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
                                    className={inputClass}
                                />
                            </div>
                        )}

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

                        {form.role === 'Sales' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Max Discount Allowed %</label>
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
                                onClick={() => setInternalPreviewMode(false)}
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
                                className="flex-1 rounded-xl bg-[hsl(var(--primary))] text-white py-3 text-sm font-semibold disabled:opacity-60 transition-all flex items-center justify-center gap-2"
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
