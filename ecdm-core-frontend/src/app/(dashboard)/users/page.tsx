'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Users, Edit2, Trash2, X, AlertCircle, UserPlus, Shield, CheckCircle, XCircle, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import AddUserDialog from '@/components/users/AddUserDialog';
import { useAuthStore } from '@/features/auth/useAuth';

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
    createdAt: string;
    lastLogin?: string;
    targetBudget?: number;
    targetSales?: number;
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

const inputClass = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

// Role Badge Component
const RoleBadge = ({ role }: { role: string }) => {
    const styles: Record<string, string> = {
        SuperAdmin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
        Manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
        Sales: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
        Operations: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
        Maintenance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
        HR: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border border-pink-200 dark:border-pink-800',
        MaintenanceEngineer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
        Technician: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800',
        CustomerService: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
        'R&D': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    };
    const label = ROLES.find(r => r.value === role)?.label || role;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[role] || 'bg-gray-100 text-gray-600'}`}>
            <Shield className="h-3 w-3" />
            {label}
        </span>
    );
};

// Status Badge Component
const StatusBadge = ({ isActive }: { isActive: boolean }) => {
    if (isActive) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-3 w-3" />
                Active
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
            <XCircle className="h-3 w-3" />
            Inactive
        </span>
    );
};

type EditForm = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    phone: string;
    isActive: boolean;
    targetBudget?: number;
    targetSales?: number;
};

const blankEdit: EditForm = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: '',
    phone: '',
    isActive: true,
    targetBudget: 0,
    targetSales: 0,
};

export default function UsersPage() {
    const { user: currentUser } = useAuthStore();
    const [rows, setRows] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [loading, setLoading] = useState(true);

    // Add Dialog
    const [addOpen, setAddOpen] = useState(false);

    // Edit Dialog
    const [editModal, setEditModal] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const [form, setForm] = useState<EditForm>(blankEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Delete Dialog
    const [delId, setDelId] = useState<string | null>(null);

    // Target Dialog
    const [targetModal, setTargetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [targetAmount, setTargetAmount] = useState('');
    const [settingTarget, setSettingTarget] = useState(false);
    const [loadingTarget, setLoadingTarget] = useState(false);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);
    const isSuperAdmin = currentUser?.role === 'SuperAdmin';

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (search) params.search = search;
            if (filterRole) params.role = filterRole;

            const { data } = await api.get('/auth/users', { params });
            setRows(data.data.data);
            setTotal(data.data.pagination.total);
        } catch {
            toast.error('Failed to load users');
        }
        setLoading(false);
    }, [page, search, filterRole]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const openEdit = (user: User) => {
        setEditing(user);
        setForm({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            password: '', // Don't pre-fill password
            role: user.role || '',
            phone: user.phone || '',
            isActive: user.isActive ?? true,
            targetBudget: user.targetBudget || 0,
            targetSales: user.targetSales || 0,
        });
        setEditModal(true);
    };

    const closeEdit = () => {
        setEditModal(false);
        setEditing(null);
        setForm(blankEdit);
        setError('');
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;

        setSaving(true);
        setError('');

        try {
            // Only send password if it was changed
            const payload: Partial<EditForm> = {
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                role: form.role,
                phone: form.phone,
                isActive: form.isActive,
                targetBudget: form.targetBudget,
                targetSales: form.targetSales,
            };
            if (form.password) {
                payload.password = form.password;
            }

            await api.put(`/auth/users/${editing._id}`, payload);
            toast.success('User updated successfully');
            closeEdit();
            fetchUsers();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to update user');
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!delId) return;

        try {
            await api.delete(`/auth/users/${delId}`);
            toast.success('User deleted successfully');
            setDelId(null);
            fetchUsers();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const openTargetDialog = async (user: User) => {
        setSelectedUser(user);
        setTargetAmount('');
        setTargetModal(true);
        setLoadingTarget(true);

        try {
            const currentDate = new Date();
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();

            // Fetch existing target for this user/month/year
            const { data } = await api.get('/sales/targets', {
                params: {
                    salespersonId: user._id,
                    month,
                    year,
                    limit: 1,
                },
            });

            // If target exists, pre-fill the input
            if (data.data?.data && data.data.data.length > 0) {
                setTargetAmount(String(data.data.data[0].targetAmount));
            } else {
                setTargetAmount('');
            }
        } catch (err) {
            console.error('Failed to fetch existing target:', err);
            // Keep input empty if fetch fails
            setTargetAmount('');
        } finally {
            setLoadingTarget(false);
        }
    };

    const handleSetTarget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setSettingTarget(true);
        try {
            const currentDate = new Date();
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();

            await api.post('/sales/targets', {
                salespersonId: selectedUser._id,
                targetAmount: Number(targetAmount),
                month,
                year,
            });

            toast.success(`Target set for ${selectedUser.firstName} ${selectedUser.lastName}`);
            setTargetModal(false);
            setSelectedUser(null);
            setTargetAmount('');
            // Refresh table so the synced targetSales/targetBudget appears immediately
            fetchUsers();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || 'Failed to set target');
        }
        setSettingTarget(false);
    };

    const columns = [
        {
            key: 'employeeId',
            header: 'Employee ID',
            render: (row: User) => (
                <span className="font-bold text-blue-600 dark:text-blue-400">
                    {row.employeeId || '-'}
                </span>
            ),
        },
        {
            key: 'fullName',
            header: 'Name',
            render: (row: User) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.fullName}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{row.email}</span>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            render: (row: User) => <RoleBadge role={row.role} />,
        },
        {
            key: 'isActive',
            header: 'Status',
            render: (row: User) => <StatusBadge isActive={row.isActive} />,
        },
        {
            key: 'createdAt',
            header: 'Created',
            render: (row: User) => new Date(row.createdAt).toLocaleDateString(),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-7 w-7 text-[hsl(var(--primary))]" />
                        User Management
                    </h1>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                        Manage employees and their access permissions
                    </p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => setAddOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                    >
                        <UserPlus className="h-4 w-4" />
                        Add Employee
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className={`${inputClass} sm:max-w-xs`}
                />
                <select
                    value={filterRole}
                    onChange={(e) => {
                        setFilterRole(e.target.value);
                        setPage(1);
                    }}
                    className={`${inputClass} sm:max-w-[200px]`}
                >
                    <option value="">All Roles</option>
                    {ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                            {role.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <DataTable
                data={rows}
                columns={columns}
                loading={loading}
                emptyMessage="No users found."
                page={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={limit}
                onPageChange={setPage}
                selectionDisabled={!isSuperAdmin}
                renderActions={(row: User) => (
                    isSuperAdmin && row._id !== currentUser?._id ? (
                        <div className="flex items-center gap-2">
                            {/* Set Target button - only for Sales and Marketing roles */}
                            {(row.role === 'Sales' || row.role === 'Marketing') && (
                                <button
                                    onClick={() => openTargetDialog(row)}
                                    className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors"
                                    title={row.role === 'Marketing' ? "Set marketing budget" : "Set sales target"}
                                >
                                    <Target className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                onClick={() => openEdit(row)}
                                className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                                title="Edit user"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setDelId(row._id)}
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                title="Delete user"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ) : null
                )}
                defaultVisibility={{
                    createdAt: false,
                }}
            />

            {/* Add User Dialog */}
            <AddUserDialog
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                onSuccess={fetchUsers}
            />

            {/* Edit User Dialog */}
            {
                editModal && editing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Edit2 className="h-6 w-6 text-[hsl(var(--primary))]" />
                                    <h2 className="text-lg font-bold">Edit Employee</h2>
                                </div>
                                <button onClick={closeEdit} className="hover:opacity-70">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">First Name</label>
                                        <input
                                            type="text"
                                            value={form.firstName}
                                            onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Last Name</label>
                                        <input
                                            type="text"
                                            value={form.lastName}
                                            onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Password <span className="text-[hsl(var(--muted-foreground))]">(leave blank to keep current)</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="Enter new password"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Role</label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                                        className={inputClass}
                                    >
                                        {ROLES.map(role => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                        <label className="block text-sm font-medium mb-1.5">Phone</label>
                                        <input
                                            type="text"
                                            value={form.phone}
                                            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={form.isActive}
                                        onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                        className="h-4 w-4 rounded border-[hsl(var(--border))]"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium">
                                        Active Account
                                    </label>
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3">
                                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50 hover:opacity-90 transition-opacity"
                                    >
                                        {saving ? 'Saving...' : 'Update Employee'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeEdit}
                                        className="px-6 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Dialog */}
            {
                delId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
                            <div className="flex flex-col items-center text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                                    <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">Delete User?</h3>
                                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                                    This action cannot be undone. The user will lose access to the system.
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setDelId(null)}
                                        className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Set Target Dialog */}
            {
                targetModal && selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                        <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">
                                            {selectedUser.role === 'Marketing' ? 'Set Monthly Marketing Budget' : 'Set Monthly Sales Target'}
                                        </h3>
                                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                            {selectedUser.firstName} {selectedUser.lastName}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setTargetModal(false)} 
                                    className="hover:opacity-70"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSetTarget} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        {selectedUser.role === 'Marketing' ? 'Target Budget ($/EGP)' : 'Target Amount ($/EGP)'}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={targetAmount}
                                        onChange={(e) => setTargetAmount(e.target.value)}
                                        placeholder={loadingTarget ? "Loading existing target..." : "Enter monthly target amount..."}
                                        disabled={loadingTarget}
                                        className={inputClass}
                                        required
                                    />
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
                                        This will set the target for {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setTargetModal(false)}
                                        className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={settingTarget}
                                        className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                                    >
                                        {settingTarget ? 'Setting...' : 'Set Target'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
