'use client';
import { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ── Validation Schema ───────────────────────────────────────────────
const formSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.string().min(1, 'Role is required'),
    phone: z.string().optional(),
    department: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// ── Available Roles ─────────────────────────────────────────────────
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
] as const;

interface AddUserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const inputClass = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

export default function AddUserDialog({ isOpen, onClose, onSuccess }: AddUserDialogProps) {
    const [form, setForm] = useState<FormData>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: '',
        phone: '',
        department: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [saving, setSaving] = useState(false);
    const [apiError, setApiError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (errors[name as keyof FormData]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError('');
        setErrors({});

        // Validate form
        const result = formSchema.safeParse(form);
        if (!result.success) {
            const fieldErrors: Partial<Record<keyof FormData, string>> = {};
            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as keyof FormData;
                if (!fieldErrors[field]) {
                    fieldErrors[field] = issue.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        setSaving(true);
        try {
            await api.post('/auth/users', form);
            toast.success('Employee created successfully');
            handleClose();
            onSuccess();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setApiError(error.response?.data?.message || 'Failed to create employee');
        }
        setSaving(false);
    };

    const handleClose = () => {
        setForm({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            role: '',
            phone: '',
            department: '',
        });
        setErrors({});
        setApiError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <UserPlus className="h-6 w-6 text-[hsl(var(--primary))]" />
                        <h2 className="text-lg font-bold">Add New Employee</h2>
                    </div>
                    <button onClick={handleClose} className="hover:opacity-70" type="button">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="firstName"
                                value={form.firstName}
                                onChange={handleChange}
                                placeholder="John"
                                className={inputClass}
                            />
                            {errors.firstName && (
                                <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="lastName"
                                value={form.lastName}
                                onChange={handleChange}
                                placeholder="Doe"
                                className={inputClass}
                            />
                            {errors.lastName && (
                                <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
                            )}
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="john.doe@company.com"
                            className={inputClass}
                        />
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Minimum 8 characters"
                            className={inputClass}
                        />
                        {errors.password && (
                            <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                        )}
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            className={inputClass}
                        >
                            <option value="">Select a role</option>
                            {ROLES.map(role => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                        {errors.role && (
                            <p className="mt-1 text-xs text-red-500">{errors.role}</p>
                        )}
                    </div>

                    {/* Phone (Optional) */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Phone <span className="text-[hsl(var(--muted-foreground))]">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="+1 234 567 890"
                            className={inputClass}
                        />
                    </div>

                    {/* Department (Optional) */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Department <span className="text-[hsl(var(--muted-foreground))]">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            name="department"
                            value={form.department}
                            onChange={handleChange}
                            placeholder="Engineering"
                            className={inputClass}
                        />
                    </div>

                    {/* API Error */}
                    {apiError && (
                        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3">
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                        >
                            {saving ? 'Creating...' : 'Create Employee'}
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-6 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
