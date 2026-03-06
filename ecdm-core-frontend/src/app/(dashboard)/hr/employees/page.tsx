'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import Link from 'next/link';
import { 
    Users, Search, Eye, Shield, CheckCircle, XCircle, 
    Phone, Mail, Building 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Employee {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    phone?: string;
    department?: string;
    employeeId?: string;
    avatarUrl?: string;
    createdAt: string;
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
] as const;

const ROLE_STYLES: Record<string, string> = {
    SuperAdmin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
    Manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    Sales: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    Operations: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
    HR: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border border-pink-200 dark:border-pink-800',
};

const RoleBadge = ({ role }: { role: string }) => {
    const label = ROLES.find(r => r.value === role)?.label || role;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[role] || 'bg-gray-100 text-gray-600'}`}>
            <Shield className="h-3 w-3" />
            {label}
        </span>
    );
};

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
    }`}>
        {isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {isActive ? 'Active' : 'Inactive'}
    </span>
);

const inputClass = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

export default function EmployeesPage() {
    const [rows, setRows] = useState<Employee[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    
    const limit = 20;
    const totalPages = Math.ceil(total / limit);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (search) params.search = search;
            if (filterRole) params.role = filterRole;
            if (filterDepartment) params.department = filterDepartment;
            
            const { data } = await api.get('/hr/employees', { params });
            setRows(data.data.data);
            setTotal(data.data.pagination.total);
        } catch {
            toast.error('Failed to load employees');
        }
        setLoading(false);
    }, [page, search, filterRole, filterDepartment]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    // Column definitions
    const columns = [
        {
            key: 'fullName',
            header: 'Employee',
            render: (row: Employee) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center overflow-hidden">
                        {row.avatarUrl ? (
                            <img src={row.avatarUrl} alt={row.fullName} className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                                {row.firstName?.[0]}{row.lastName?.[0]}
                            </span>
                        )}
                    </div>
                    <div>
                        <span className="font-medium">{row.fullName}</span>
                        {row.employeeId && (
                            <span className="block text-xs text-[hsl(var(--muted-foreground))]">
                                ID: {row.employeeId}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'email',
            header: 'Contact',
            render: (row: Employee) => (
                <div className="space-y-1">
                    <span className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                        {row.email}
                    </span>
                    {row.phone && (
                        <span className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))]">
                            <Phone className="h-3 w-3" />
                            {row.phone}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'department',
            header: 'Department',
            render: (row: Employee) => (
                <span className="flex items-center gap-1">
                    <Building className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    {row.department || '—'}
                </span>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            render: (row: Employee) => <RoleBadge role={row.role} />,
        },
        {
            key: 'isActive',
            header: 'Status',
            render: (row: Employee) => <StatusBadge isActive={row.isActive} />,
        },
    ];

    // Actions renderer
    const renderActions = (row: Employee) => (
        <Link
            href={`/hr/employees/${row._id}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-colors"
        >
            <Eye className="h-3.5 w-3.5" />
            View Profile
        </Link>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-[hsl(var(--primary))]" />
                <div>
                    <h1 className="text-2xl font-bold">Employees</h1>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {total} employees found
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <input
                        type="text"
                        placeholder="Search by name, email, ID..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className={`${inputClass} pl-9`}
                    />
                </div>
                
                <select
                    value={filterRole}
                    onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                    className={inputClass + ' w-auto min-w-[150px]'}
                >
                    <option value="">All Roles</option>
                    {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
                
                <input
                    type="text"
                    placeholder="Department"
                    value={filterDepartment}
                    onChange={(e) => { setFilterDepartment(e.target.value); setPage(1); }}
                    className={inputClass + ' w-auto min-w-[150px]'}
                />
                
                {(search || filterRole || filterDepartment) && (
                    <button
                        onClick={() => {
                            setSearch('');
                            setFilterRole('');
                            setFilterDepartment('');
                            setPage(1);
                        }}
                        className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Data Table */}
            <DataTable
                data={rows}
                columns={columns}
                loading={loading}
                emptyMessage="No employees found."
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                renderActions={renderActions}
                selectionDisabled
            />
        </div>
    );
}
