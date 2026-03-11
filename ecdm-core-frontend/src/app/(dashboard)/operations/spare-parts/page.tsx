'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Wrench, Plus, X } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { createSparePartColumns, createActionsRenderer, type SparePart } from './columns';
import AddSparePartDialog from './AddSparePartDialog';
import EditSparePartDialog from './EditSparePartDialog';

/**
 * Spare Parts Page - Operations/Inventory Module
 * 
 * Features:
 * - Data table with pagination
 * - Search by item name, specification, or ID
 * - Filter by category
 * - CRUD operations with file upload support
 * - Bulk delete (Admin only)
 */

export default function SparePartsPage() {
    const [rows, setRows] = useState<SparePart[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editing, setEditing] = useState<SparePart | null>(null);
    const [delId, setDelId] = useState<string | null>(null);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    // ─── Fetch Spare Parts ────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (search) params.search = search;
            if (categoryFilter) params.category = categoryFilter;

            const { data } = await api.get('/operations/spare-parts', { params });
            setRows(data.data.data);
            setTotal(data.data.pagination.total);
        } catch (err) {
            console.error('Failed to fetch spare parts:', err);
        }
        setLoading(false);
    }, [page, search, categoryFilter]);

    // ─── Fetch Categories for Filter ──────────────────────────────────────────
    const fetchCategories = useCallback(async () => {
        try {
            const { data } = await api.get('/operations/spare-parts/categories');
            setCategories(data.data.categories || []);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const openAdd = () => setShowAddModal(true);

    const openEdit = (sparePart: SparePart) => setEditing(sparePart);

    const handleDelete = async () => {
        if (!delId) return;
        try {
            await api.delete(`/operations/spare-parts/${delId}`);
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

    // ─── Column Definitions ───────────────────────────────────────────────────
    const columns = createSparePartColumns();

    // ─── Row Actions ──────────────────────────────────────────────────────────
    const renderActions = createActionsRenderer({
        onEdit: openEdit,
        onDelete: (row: SparePart) => setDelId(row._id),
    });

    return (
        <div className="space-y-6">
            {/* ─── Header ──────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Wrench className="h-7 w-7 text-[hsl(var(--primary))]" />
                    <h1 className="text-2xl font-bold">Spare Parts</h1>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                >
                    <Plus className="h-4 w-4" />
                    Add Spare Part
                </button>
            </div>

            {/* ─── Filters ─────────────────────────────────────────────────────── */}
            <div className="flex gap-3 flex-wrap">
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
                    className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm"
                >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
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
                    columns={columns}
                    loading={loading}
                    emptyMessage="No spare parts found."
                    page={page}
                    totalPages={totalPages}
                    totalItems={total}
                    itemsPerPage={limit}
                    onPageChange={setPage}
                    bulkDeleteEndpoint="/operations/spare-parts/bulk-delete"
                    onBulkDeleteSuccess={fetchData}
                    renderActions={renderActions}
                    defaultVisibility={{
                        description: false,
                        supplierInfo: false,
                        lastRestocked: false,
                        notes: false,
                    }}
                />
            </div>

            {/* ─── Add Dialog ──────────────────────────────────────────────────── */}
            {showAddModal && (
                <AddSparePartDialog
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        fetchData();
                        fetchCategories();
                    }}
                />
            )}

            {/* ─── Edit Dialog ─────────────────────────────────────────────────── */}
            {editing && (
                <EditSparePartDialog
                    sparePart={editing}
                    onClose={() => setEditing(null)}
                    onSuccess={() => {
                        fetchData();
                        fetchCategories();
                    }}
                />
            )}

            {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
            {delId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl p-6">
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
                            Are you sure you want to delete this spare part? This action cannot be undone.
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
