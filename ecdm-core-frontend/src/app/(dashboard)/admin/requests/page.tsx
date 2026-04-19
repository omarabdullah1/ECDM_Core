'use client';
import { useState, useEffect, useCallback } from 'react';
import { FileEdit, Search, Filter, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import { useAuthStore } from '@/features/auth/useAuth';
import { useRouter } from 'next/navigation';
import ReviewRequestDialog from './ReviewRequestDialog';
import { PageHeader } from '@/components/layout/PageHeader';

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export interface ModificationRequest {
    _id: string;
    moduleName: string;
    recordId: string;
    requestedBy: User;
    originalData: Record<string, unknown>;
    proposedData: Record<string, unknown>;
    status: 'Pending' | 'Approved' | 'Rejected';
    reviewedBy?: User;
    reviewNotes?: string;
    createdAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge Component
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, { bg: string; icon: typeof CheckCircle }> = {
        Pending: {
            bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
            icon: Clock
        },
        Approved: {
            bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
            icon: CheckCircle
        },
        Rejected: {
            bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
            icon: XCircle
        },
    };

    const style = styles[status] || styles.Pending;
    const Icon = style.icon;

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg}`}>
            <Icon className="h-3 w-3" />
            {status}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Module Badge Component
// ─────────────────────────────────────────────────────────────────────────────

const ModuleBadge = ({ moduleName }: { moduleName: string }) => {
    const moduleLabels: Record<string, string> = {
        SalesOrder: 'Sales Order',
        CustomerOrder: 'Customer Order',
        WorkOrder: 'Work Order',
        SalesLead: 'Sales Lead',
        SalesData: 'Sales Data',
        MarketingLead: 'Marketing Lead',
        SalesFollowUp: 'Sales Follow-up',
        CustomerFollowUp: 'Customer Follow-up',
        Feedback: 'Feedback',
        InventoryPlus: 'Inventory',
        SparePart: 'Spare Part',
        Customer: 'Customer',
        Employee: 'Employee',
    };

    return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-400/30">
            {moduleLabels[moduleName] || moduleName}
        </span>
    );
};

const inputClass = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ModificationRequestsPage() {
    const router = useRouter();
    const { user: currentUser } = useAuthStore();

    // State
    const [requests, setRequests] = useState<ModificationRequest[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterModule, setFilterModule] = useState('');

    // Review Dialog
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ModificationRequest | null>(null);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    // Check admin access
    const isAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Manager';

    useEffect(() => {
        if (!isAdmin) {
            router.replace('/dashboard');
        }
    }, [isAdmin, router]);

    // Fetch modification requests
    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (filterStatus) params.status = filterStatus;
            if (filterModule) params.moduleName = filterModule;

            const { data } = await api.get('/admin/modification-requests', { params });
            setRequests(data.data.data);
            setTotal(data.data.pagination.total);
        } catch {
            toast.error('Failed to load modification requests');
        }
        setLoading(false);
    }, [page, filterStatus, filterModule]);

    useEffect(() => {
        if (isAdmin) {
            fetchRequests();
        }
    }, [fetchRequests, isAdmin]);

    // Handle review button click
    const handleReview = (request: ModificationRequest) => {
        setSelectedRequest(request);
        setReviewDialogOpen(true);
    };

    // Handle review submission
    const handleReviewSubmit = async (status: 'Approved' | 'Rejected', reviewNotes: string) => {
        if (!selectedRequest) return;

        try {
            await api.post(`/admin/modification-requests/${selectedRequest._id}/review`, {
                status,
                reviewNotes,
            });

            toast.success(`Request ${status.toLowerCase()} successfully`);
            setReviewDialogOpen(false);
            setSelectedRequest(null);
            fetchRequests();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || 'Failed to process request');
        }
    };

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Table columns
    const columns = [
        {
            key: 'moduleName',
            header: 'Module',
            render: (row: ModificationRequest) => <ModuleBadge moduleName={row.moduleName} />,
        },
        {
            key: 'requestedBy',
            header: 'Requested By',
            render: (row: ModificationRequest) => (
                <div className="flex flex-col">
                    <span className="font-medium">
                        {row.requestedBy?.firstName} {row.requestedBy?.lastName}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {row.requestedBy?.email}
                    </span>
                </div>
            ),
        },
        {
            key: 'createdAt',
            header: 'Date Submitted',
            render: (row: ModificationRequest) => formatDate(row.createdAt),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: ModificationRequest) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row: ModificationRequest) => (
                <button
                    onClick={() => handleReview(row)}
                    disabled={row.status !== 'Pending'}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${row.status === 'Pending'
                            ? 'bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90'
                            : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
                        }`}
                >
                    <FileEdit className="h-4 w-4" />
                    {row.status === 'Pending' ? 'Review' : 'Reviewed'}
                </button>
            ),
        },
    ];

    if (!isAdmin) return null;

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <PageHeader
                title="Modification Requests"
                icon={FileEdit}
                description="Review and approve/reject pending modification requests from users"
                actions={
                    requests.filter(r => r.status === 'Pending').length > 0 ? (
                        <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-semibold">
                                {requests.filter(r => r.status === 'Pending').length} Pending
                            </span>
                        </div>
                    ) : undefined
                }
            />

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <select
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setPage(1);
                        }}
                        className={`${inputClass} ps-10 appearance-none cursor-pointer`}
                    >
                        <option value="">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <select
                        value={filterModule}
                        onChange={(e) => {
                            setFilterModule(e.target.value);
                            setPage(1);
                        }}
                        className={`${inputClass} ps-10 appearance-none cursor-pointer`}
                    >
                        <option value="">All Modules</option>
                        <option value="SalesOrder">Sales Order</option>
                        <option value="CustomerOrder">Customer Order</option>
                        <option value="WorkOrder">Work Order</option>
                        <option value="SalesLead">Sales Lead</option>
                        <option value="SalesData">Sales Data</option>
                        <option value="MarketingLead">Marketing Lead</option>
                        <option value="Customer">Customer</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <DataTable
                data={requests}
                columns={columns}
                loading={loading}
                emptyMessage="No modification requests found."
                page={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={limit}
                onPageChange={setPage}
                selectionDisabled={true}
                defaultVisibility={{
                    createdAt: false,
                }}
            />

            {/* Review Dialog */}
            {selectedRequest && (
                <ReviewRequestDialog
                    open={reviewDialogOpen}
                    onOpenChange={setReviewDialogOpen}
                    request={selectedRequest}
                    onSubmit={handleReviewSubmit}
                />
            )}
        </div>
    );
}
