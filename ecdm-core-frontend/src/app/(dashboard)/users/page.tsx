'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Users, Edit2, Trash2, X, AlertCircle, UserPlus, Shield, CheckCircle, XCircle, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import AddUserDialog from '@/components/users/AddUserDialog';
import EditUserDialog from '@/components/users/EditUserDialog';
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
    maxDiscountPercentage?: number;
    workStartTime?: string;
    workEndTime?: string;
    gracePeriod?: number;
    halfDayThreshold?: number;
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
        Finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
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
    const [initialEditMode, setInitialEditMode] = useState(false);
    // Delete Dialog
    const [delId, setDelId] = useState<string | null>(null);

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

    const openEdit = (user: User, editMode = false) => {
        setEditing(user);
        setInitialEditMode(editMode);
        setEditModal(true);
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

    const columns = [
        {
            key: 'employeeId',
            header: 'Employee ID',
            className: 'md:w-[1%] md:whitespace-nowrap',
            render: (row: User) => (
                <span className="font-bold text-blue-600 dark:text-blue-400">
                    {row.employeeId || '-'}
                </span>
            ),
        },
        {
            key: 'fullName',
            header: 'Name',
            className: 'md:w-auto md:max-w-[150px] md:truncate',
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
            className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: User) => <RoleBadge role={row.role} />,
        },
        {
            key: 'isActive',
            header: 'Status',
            className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: User) => <StatusBadge isActive={row.isActive} />,
        },
        {
            key: 'createdAt',
            header: 'Created',
            className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: User) => new Date(row.createdAt).toLocaleDateString(),
        },
        {
            key: 'maxDiscountPercentage',
            header: 'Discount Limit',
            className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: User) => row.role === 'Sales' ? (
                <span className="font-medium text-orange-600 dark:text-orange-400">
                    {row.maxDiscountPercentage || 0}%
                </span>
            ) : <span className="text-gray-400 text-xs">—</span>,
        },
    ];

    return (
        <div className="space-y-6 pb-8">
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
                onRowClick={isSuperAdmin ? (r) => openEdit(r, false) : undefined}
                renderActions={(row: User) => (
                    isSuperAdmin && row._id !== currentUser?._id ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => openEdit(row, true)}
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
            {editing && (
                <EditUserDialog
                    isOpen={editModal}
                    user={editing}
                    onClose={() => {
                        setEditModal(false);
                        setEditing(null);
                    }}
                    onSuccess={fetchUsers}
                    initialEditMode={initialEditMode}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {
                delId && (
                    <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in transition-all">
                        <div className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] modern-glass-card m-auto relative premium-shadow animate-in-slide p-6 shadow-2xl">
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
                                        className="flex-1 flex-1 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-2 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
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
        </div >
    );
}

