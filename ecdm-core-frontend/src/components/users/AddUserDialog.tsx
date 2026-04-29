'use client';
import { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

// ── Validation Schema ───────────────────────────────────────────────
const formSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.string().min(1, 'Role is required'),
    phone: z.string().optional(),
    targetBudget: z.number().optional(),
    targetSales: z.number().optional(),
    maxDiscountPercentage: z.number().min(0).max(100).optional(),
    workStartTime: z.string().optional(),
    workEndTime: z.string().optional(),
    gracePeriod: z.coerce.number().min(0).optional(),
    halfDayThreshold: z.coerce.number().min(0).optional(),
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
    { value: 'Marketing', label: 'Marketing' },
    { value: 'R&D', label: 'R&D' },
    { value: 'Finance', label: 'Finance' },
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
        targetBudget: 0,
        targetSales: 0,
        maxDiscountPercentage: 0,
        workStartTime: '09:00',
        workEndTime: '17:00',
        gracePeriod: 15,
        halfDayThreshold: 4.5,
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
            targetBudget: 0,
            targetSales: 0,
            maxDiscountPercentage: 0,
            workStartTime: '09:00',
            workEndTime: '17:00',
            gracePeriod: 15,
            halfDayThreshold: 4.5,
        });
        setErrors({});
        setApiError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <UserPlus className="h-5 w-5 text-[hsl(var(--primary))]" />
                        <DialogTitle>Add New Employee</DialogTitle>
                    </div>
                </DialogHeader>

                <DialogBody>
                    <form id="add-user-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">First Name</label>
                                <Input
                                    type="text"
                                    name="firstName"
                                    value={form.firstName}
                                    onChange={handleChange}
                                    placeholder="John"
                                />
                                {errors.firstName && (
                                    <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.firstName}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Name</label>
                                <Input
                                    type="text"
                                    name="lastName"
                                    value={form.lastName}
                                    onChange={handleChange}
                                    placeholder="Doe"
                                />
                                {errors.lastName && (
                                    <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.lastName}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                            <Input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="john.doe@company.com"
                            />
                            {errors.email && (
                                <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.email}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                            <Input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Minimum 8 characters"
                            />
                            {errors.password && (
                                <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.password}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned Role</label>
                                <Select
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                >
                                    <option value="">Select a role</option>
                                    {ROLES.map(role => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </Select>
                                {errors.role && (
                                    <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.role}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone (Optional)</label>
                                <Input
                                    type="text"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shift Start Time</label>
                                <Input
                                    type="time"
                                    name="workStartTime"
                                    value={form.workStartTime}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shift End Time</label>
                                <Input
                                    type="time"
                                    name="workEndTime"
                                    value={form.workEndTime}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {form.role === 'Sales' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max Discount %</label>
                                    <Input
                                        type="number"
                                        name="maxDiscountPercentage"
                                        value={form.maxDiscountPercentage}
                                        onChange={(e) => setForm(prev => ({ ...prev, maxDiscountPercentage: Number(e.target.value) }))}
                                        min="0"
                                        max="100"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Grace Period (Min)</label>
                                <Input
                                    type="number"
                                    name="gracePeriod"
                                    value={form.gracePeriod}
                                    onChange={handleChange}
                                    placeholder="15"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Half-day (Hrs)</label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    name="halfDayThreshold"
                                    value={form.halfDayThreshold}
                                    onChange={handleChange}
                                    placeholder="4.5"
                                />
                            </div>
                        </div>

                        {apiError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-medium">
                                <AlertCircle className="h-4 w-4" />
                                {apiError}
                            </div>
                        )}
                    </form>
                </DialogBody>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="add-user-form"
                        disabled={saving}
                    >
                        {saving ? 'Creating...' : 'Create Employee'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

