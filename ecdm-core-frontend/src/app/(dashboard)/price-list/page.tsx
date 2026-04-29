'use client';

import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import api from '@/lib/axios';
import { useAuthStore } from '@/features/auth/useAuth';
import toast from 'react-hot-toast';
import { Tags, CheckCircle2, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
    createPriceActionsRenderer,
    getPriceListColumns,
    type PriceListItem,
} from './columns';
import PriceUpdateDialog from './PriceUpdateDialog';

/**
 * Price List Page
 *
 * Displays inventory items with pricing information.
 * Roles:
 *   - Finance: Can propose prices (sets pendingUnitPrice + status=Pending)
 *   - Admin/SuperAdmin: Can confirm proposed prices
 *   - Sales: Read-only view
 *   - Operations: NOT accessible (redirected)
 */

const CATEGORIES = ['Maintenance', 'General supply', 'Supply and installation'] as const;

export default function PriceListPage() {
    const { user } = useAuthStore();
    const role = user?.role;

    // Role checks
    const isAdmin = role === 'SuperAdmin' || role === 'Admin';
    const isFinance = role === 'Finance';
    const isSales = role === 'Sales';
    const canPropose = isFinance || isAdmin;
    const canConfirm = isAdmin;
    const showPendingColumn = isFinance || isAdmin;

    // State
    const [rows, setRows] = useState<PriceListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [proposing, setProposing] = useState<PriceListItem | null>(null);
    const [confirming, setConfirming] = useState<PriceListItem | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    // ─── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (search) params.search = search;
            if (categoryFilter) params.category = categoryFilter;

            const { data } = await api.get('/operations/inventory', { params });
            let items = data.data.data || [];

            // Filter by price status on client side if needed
            if (statusFilter) {
                items = items.filter((item: PriceListItem) =>
                    statusFilter === 'Pending'
                        ? item.priceStatus === 'Pending'
                        : item.priceStatus === 'Confirmed' || !item.priceStatus
                );
            }

            setRows(items);
            setTotal(data.data.pagination?.total || 0);
        } catch (err) {
            console.error('Failed to fetch price list:', err);
            toast.error('Failed to load price list');
            setRows([]);
        }
        setLoading(false);
    }, [page, search, categoryFilter, statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleConfirmPrice = async () => {
        if (!confirming) return;
        setIsConfirming(true);
        try {
            await api.post(`/operations/inventory/confirm-price/${confirming._id}`);
            toast.success(`Price confirmed for ${confirming.itemName}`);
            setConfirming(null);
            fetchData();
        } catch (error: any) {
            console.error('Failed to confirm price:', error);
            toast.error(error.response?.data?.message || 'Failed to confirm price');
        } finally {
            setIsConfirming(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCategoryFilter(e.target.value);
        setPage(1);
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
        setPage(1);
    };

    // ─── Columns & Actions ────────────────────────────────────────────────────
    const columns = getPriceListColumns(showPendingColumn);

    const renderActions = createPriceActionsRenderer({
        onProposePrice: canPropose ? (row) => setProposing(row) : undefined,
        onConfirmPrice: canConfirm ? (row) => setConfirming(row) : undefined,
        canPropose,
        canConfirm,
    });

    return (
        <div className="space-y-6 pb-8">
            {/* ─── Header ──────────────────────────────────────────────────────── */}
            <PageHeader
                title="Price List"
                icon={Tags}
                description={
                    isFinance
                        ? 'Propose new prices for inventory items — requires Admin confirmation'
                        : isAdmin
                        ? 'Review and confirm proposed prices for inventory items'
                        : 'View current pricing for inventory items'
                }
            />

            {/* ─── Filters ─────────────────────────────────────────────────────── */}
            <div className="flex gap-3 flex-wrap animate-in-slide stagger-2">
                <input
                    type="text"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Search by name, ID, or specification..."
                    className="flex-1 min-w-[200px] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
                />
                <select
                    value={categoryFilter}
                    onChange={handleCategoryChange}
                    className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10"
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
                {showPendingColumn && (
                    <select
                        value={statusFilter}
                        onChange={handleStatusChange}
                        className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10"
                    >
                        <option value="">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                    </select>
                )}
            </div>

            {/* ─── Data Table ──────────────────────────────────────────────────── */}
            <div className="w-full">
                <DataTable
                    data={rows}
                    columns={columns}
                    loading={loading}
                    emptyMessage="No inventory items found."
                    page={page}
                    totalPages={totalPages}
                    totalItems={total}
                    itemsPerPage={limit}
                    onPageChange={setPage}
                    renderActions={canPropose || canConfirm ? renderActions : undefined}
                />
            </div>

            {/* ─── Propose Price Dialog ─────────────────────────────────────────── */}
            <PriceUpdateDialog
                item={proposing}
                isOpen={!!proposing}
                onClose={() => setProposing(null)}
                onSuccess={fetchData}
            />

            {/* ─── Confirm Price Modal ──────────────────────────────────────────── */}
            {confirming && (
                <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in transition-all">
                    <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] modern-glass-card m-auto relative premium-shadow animate-in-slide shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Confirm Price</h3>
                                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                    {confirming.sparePartsId} • {confirming.itemName}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                                <span className="text-xs font-bold text-slate-500 uppercase">Current Price</span>
                                <span className="text-sm font-bold">
                                    EGP {(confirming.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                                    New Price (to confirm)
                                </span>
                                <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                                    EGP {(confirming.pendingUnitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-5 text-center">
                            Once confirmed, the current price will be updated to the proposed price.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirming(null)}
                                className="px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors"
                                disabled={isConfirming}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmPrice}
                                disabled={isConfirming}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
                            >
                                {isConfirming ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                Confirm Price
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
