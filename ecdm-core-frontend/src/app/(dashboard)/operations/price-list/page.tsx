'use client';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { Plus, Tags, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AddPriceListDialog from './AddPriceListDialog';
import {
    createActionsRenderer,
    priceListColumns,
    PRICE_LIST_CATEGORIES,
    type PriceListItem,
} from './columns';
import EditPriceListDialog from './EditPriceListDialog';

/**
 * Price List Page — Operations Module
 *
 * Manages a catalogue of spare parts / services with unit pricing,
 * category classification, and optional PDF data sheets.
 */

export default function PriceListPage() {
    const [rows, setRows] = useState<PriceListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editing, setEditing] = useState<PriceListItem | null>(null);
    const [delId, setDelId] = useState<string | null>(null);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    // ─── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (search) params.search = search;
            if (categoryFilter) params.category = categoryFilter;

            const { data } = await api.get('/operations/price-list', { params });
            setRows(data.data.data || []);
            setTotal(data.data.pagination?.total || 0);
        } catch (err) {
            console.error('Failed to fetch price list:', err);
            toast.error('Failed to load price list');
            setRows([]);
        }
        setLoading(false);
    }, [page, search, categoryFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!delId) return;
        try {
            await api.delete(`/operations/price-list/${delId}`);
            fetchData();
        } catch (err) {
            console.error('Delete failed:', err);
        }
        setDelId(null);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCategoryFilter(e.target.value);
        setPage(1);
    };

    // ─── Columns & Actions ────────────────────────────────────────────────────
    const renderActions = createActionsRenderer({
        onEdit: (row) => setEditing(row),
        onDelete: (row) => setDelId(row._id),
    });

    return (
        <div className="space-y-6 pb-8">

            {/* ─── Header ──────────────────────────────────────────────────────── */}
            <PageHeader
                title="Price List"
                icon={Tags}
                description="Manage spare parts, supplies, and service pricing"
                actions={
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 border-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Add Item
                    </button>
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
                    {PRICE_LIST_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* ─── Data Table ──────────────────────────────────────────────────── */}
            <div className="overflow-x-auto">
                <DataTable
                    data={rows}
                    columns={priceListColumns}
                    loading={loading}
                    emptyMessage="No price list items found. Click 'Add Item' to create one."
                    page={page}
                    totalPages={totalPages}
                    totalItems={total}
                    itemsPerPage={limit}
                    onPageChange={setPage}
                    bulkDeleteEndpoint="/operations/price-list/bulk-delete"
                    onBulkDeleteSuccess={fetchData}
                    renderActions={renderActions}
                />
            </div>

            {/* ─── Add Dialog ──────────────────────────────────────────────────── */}
            {showAddModal && (
                <AddPriceListDialog
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchData}
                />
            )}

            {/* ─── Edit Dialog ─────────────────────────────────────────────────── */}
            {editing && (
                <EditPriceListDialog
                    item={editing}
                    onClose={() => setEditing(null)}
                    onSuccess={fetchData}
                />
            )}

            {/* ─── Delete Confirmation ─────────────────────────────────────────── */}
            {delId && (
                <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in transition-all">
                    <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] modern-glass-card m-auto relative premium-shadow animate-in-slide shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Confirm Delete</h3>
                            <button
                                onClick={() => setDelId(null)}
                                className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                            Are you sure you want to delete this item? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDelId(null)}
                                className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
