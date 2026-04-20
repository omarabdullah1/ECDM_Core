'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Search, Filter, PlusCircle, Edit, Trash2, LogIn } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import { useAuthStore } from '@/features/auth/useAuth';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}

interface AuditLog {
    _id: string;
    userId: User;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER';
    moduleName: string;
    recordId?: string;
    details: Record<string, unknown>;
    ipAddress: string;
    createdAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Badge Component
// ─────────────────────────────────────────────────────────────────────────────

const ActionBadge = ({ action }: { action: string }) => {
    const config: Record<string, { bg: string; icon: typeof PlusCircle }> = {
        CREATE: {
            bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
            icon: PlusCircle
        },
        UPDATE: {
            bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
            icon: Edit
        },
        DELETE: {
            bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
            icon: Trash2
        },
        LOGIN: {
            bg: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-800',
            icon: LogIn
        },
        OTHER: {
            bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
            icon: Activity
        },
    };

    const { bg, icon: Icon } = config[action] || config.OTHER;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${bg}`}>
            <Icon className="h-3 w-3" />
            {action}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Module Badge Component
// ─────────────────────────────────────────────────────────────────────────────

const ModuleBadge = ({ moduleName }: { moduleName: string }) => {
    return (
        <span className="inline-flex items-center rounded-lg bg-[hsl(var(--secondary))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
            {moduleName}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Statistics Card Component
// ─────────────────────────────────────────────────────────────────────────────

const StatCard = ({
    label,
    value,
    icon: Icon,
    color
}: {
    label: string;
    value: number;
    icon: typeof Activity;
    color: string;
}) => (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
            <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
                <p className="mt-1 text-2xl font-bold text-[hsl(var(--foreground))]">{value.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl p-3 ${color}`}>
                <Icon className="h-6 w-6" />
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
    const router = useRouter();
    const { user: currentUser } = useAuthStore();

    // State management
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('All');
    const [moduleFilter, setModuleFilter] = useState<string>('All');

    // Check admin access
    const isAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Manager';

    useEffect(() => {
        if (!isAdmin) {
            router.replace('/dashboard');
        }
    }, [isAdmin, router]);

    // State
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    // Fetch audit logs
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (actionFilter && actionFilter !== 'All') params.action = actionFilter;
            if (moduleFilter && moduleFilter !== 'All') params.moduleName = moduleFilter;

            const { data } = await api.get('/admin/audit-logs', { params });
            setLogs(data.data.data || []);
            setTotal(data.data.pagination?.total || 0);
            setFilteredLogs(data.data.data || []);
        } catch {
            toast.error('Failed to load audit logs');
        }
        setLoading(false);
    }, [page, actionFilter, moduleFilter]);

    useEffect(() => {
        if (isAdmin) {
            fetchLogs();
        }
    }, [fetchLogs, isAdmin]);

    // Apply filters and search
    useEffect(() => {
        let result = [...logs];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (log) =>
                    log.moduleName.toLowerCase().includes(term) ||
                    log.action.toLowerCase().includes(term) ||
                    `${log.userId?.firstName} ${log.userId?.lastName}`.toLowerCase().includes(term) ||
                    log.userId?.email.toLowerCase().includes(term) ||
                    log.ipAddress?.toLowerCase().includes(term),
            );
        }

        // Action filter
        if (actionFilter !== 'All') {
            result = result.filter((log) => log.action === actionFilter);
        }

        // Module filter
        if (moduleFilter !== 'All') {
            result = result.filter((log) => log.moduleName === moduleFilter);
        }

        setFilteredLogs(result);
    }, [searchTerm, actionFilter, moduleFilter, logs]);

    // Extract unique actions and modules for filters
    const uniqueActions = ['All', ...new Set(logs.map((log) => log.action))];
    const uniqueModules = ['All', ...new Set(logs.map((log) => log.moduleName))];

    // Statistics
    const stats = {
        total: logs.length,
        creates: logs.filter((l) => l.action === 'CREATE').length,
        updates: logs.filter((l) => l.action === 'UPDATE').length,
        deletes: logs.filter((l) => l.action === 'DELETE').length,
        logins: logs.filter((l) => l.action === 'LOGIN').length,
    };

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // Table columns
    const tableColumns = [
        {
            key: 'createdAt',
            header: 'Timestamp',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: AuditLog) => (
                <span className="text-sm font-mono">{formatDate(row.createdAt)}</span>
            ),
        },
        {
            key: 'userId',
            header: 'User',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: AuditLog) => (
                <div className="flex flex-col">
                    <span className="font-medium text-sm">
                        {row.userId?.firstName} {row.userId?.lastName}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {row.userId?.email}
                    </span>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: AuditLog) => (
                <span className="inline-flex items-center rounded-md bg-[hsl(var(--muted))] px-2 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
                    {row.userId?.role || '-'}
                </span>
            ),
        },
        {
            key: 'action',
            header: 'Action',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: AuditLog) => <ActionBadge action={row.action} />,
        },
        {
            key: 'moduleName',
            header: 'Module',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: AuditLog) => <ModuleBadge moduleName={row.moduleName} />,
        },
        {
            key: 'recordId',
            header: 'Record ID',
      className: 'md:w-[1%] md:whitespace-nowrap',
            render: (row: AuditLog) => (
                <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]" title={row.recordId}>
                    {row.recordId ? `${row.recordId.substring(0, 8)}...` : '-'}
                </span>
            ),
        },
        {
            key: 'ipAddress',
            header: 'IP',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: AuditLog) => (
                <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                    {row.ipAddress || '-'}
                </span>
            ),
        },
    ];

    if (!isAdmin) return null;

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <PageHeader
                title="Audit Logs"
                icon={Activity}
                description="Track all system activities and user actions"
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <StatCard label="Total Events" value={stats.total} icon={Activity} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" />
                <StatCard label="Creates" value={stats.creates} icon={PlusCircle} color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
                <StatCard label="Updates" value={stats.updates} icon={Edit} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
                <StatCard label="Deletes" value={stats.deletes} icon={Trash2} color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" />
                <StatCard label="Logins" value={stats.logins} icon={LogIn} color="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" />
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by user, module, action, or IP..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Action Filter */}
                <div className="relative min-w-[150px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    >
                        {uniqueActions.map((action) => (
                            <option key={action} value={action}>
                                {action === 'All' ? 'All Actions' : action}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Module Filter */}
                <div className="relative min-w-[180px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select
                        value={moduleFilter}
                        onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    >
                        {uniqueModules.map((module) => (
                            <option key={module} value={module}>
                                {module === 'All' ? 'All Modules' : module}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="w-full">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Activity className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No audit logs found
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {searchTerm || actionFilter !== 'All' || moduleFilter !== 'All'
                                ? 'Try adjusting your filters or search term'
                                : 'No activity has been logged yet'}
                        </p>
                    </div>
                ) : (
                    <DataTable
                        columns={tableColumns}
                        data={filteredLogs}
                        page={page}
                        totalPages={totalPages}
                        totalItems={total}
                        itemsPerPage={limit}
                        onPageChange={setPage}
                        selectionDisabled={true}
                        defaultVisibility={{
                            recordId: false,
                            ipAddress: false,
                        }}
                    />
                )}
            </div>

            {/* Results Summary */}
        </div>
    );
}

