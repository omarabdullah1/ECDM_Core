'use client';
import { DataTable } from '@/components/ui/DataTable';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Filter, CheckCircle, Package } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { poColumns, type PurchaseOrder } from './columns';
import AddPurchaseOrderDialog from './AddPurchaseOrderDialog';
import PurchaseOrderDetailsDialog from './PurchaseOrderDetailsDialog';
import PurchaseOrderActions from './PurchaseOrderActions';

/**
 * Purchase Orders Page — Operations Module
 * 
 * Manages the procurement workflow:
 * 1. Creation of POs from low-stock suggestions or manual selection.
 * 2. Finance approval cycle.
 * 3. Operations/Engineer receipt confirmation (Updating stock).
 */

export default function PurchaseOrderPage() {
    const { user } = useAuthStore();
    const isOperations = user?.role === 'Operations' || user?.role === 'Maintenance' || user?.role === 'MaintenanceEngineer' || user?.role === 'Technician';
    const router = useRouter();

    useEffect(() => {
        if (isOperations) {
            router.replace('/dashboard');
            toast.error('Access Denied: Purchase Orders are restricted to Admin and Finance roles');
        }
    }, [isOperations, router]);

    const [rows, setRows] = useState<PurchaseOrder[]>([]);
    if (isOperations) return null;
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    // ─── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (statusFilter) params.status = statusFilter;

            const { data } = await api.get('/operations/purchase-orders', { params });
            setRows(data.data.data || []);
            setTotal(data.data.pagination?.total || 0);
        } catch (err) {
            console.error('Failed to fetch POs:', err);
            toast.error('Failed to load purchase orders');
            setRows([]);
        }
        setLoading(false);
    }, [page, statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
        setPage(1);
    };

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                title="Purchase Orders"
                icon={ShoppingCart}
                description="Manage procurement requests, approvals, and inventory receipt"
                actions={
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Create Purchase Order
                    </button>
                }
            />

            {/* ─── Filters ─────────────────────────────────────────────────────── */}
            <div className="flex gap-3 flex-wrap items-center">
                <div className="flex items-center gap-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl px-3 py-1.5 shadow-sm">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={handleStatusChange}
                        className="bg-transparent text-sm font-medium focus:outline-none min-w-[150px]"
                    >
                        <option value="">All Statuses</option>
                        <option value="PendingFinance">Pending Approval</option>
                        <option value="ApprovedFinance">Pending Receipt</option>
                        <option value="Received">Received (Completed)</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>

                <div className="flex items-center gap-4 ml-auto text-[10px] uppercase font-bold tracking-widest text-gray-400 border-l border-gray-200 pl-4 invisible md:visible">
                    <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Finance Check</div>
                    <div className="flex items-center gap-1.5"><Package className="w-3 h-3" /> Receipt</div>
                    <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Stock In</div>
                </div>
            </div>

            {/* ─── Data Table ──────────────────────────────────────────────────── */}
            <div className="w-full">
                <DataTable
                    data={rows}
                    columns={poColumns}
                    loading={loading}
                    emptyMessage="No purchase orders found. Start by clicking 'Create Purchase Order'."
                    page={page}
                    totalPages={totalPages}
                    totalItems={total}
                    itemsPerPage={limit}
                    onPageChange={setPage}
                    onRowClick={(row) => setSelectedPO(row)}
                    renderActions={(row) => (
                        <PurchaseOrderActions po={row} onActionSuccess={fetchData} />
                    )}
                />
            </div>

            {showAddModal && (
                <AddPurchaseOrderDialog
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchData}
                />
            )}

            {selectedPO && (
                <PurchaseOrderDetailsDialog
                    po={selectedPO}
                    onClose={() => setSelectedPO(null)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
}

const Clock = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);

