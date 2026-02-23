'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';

interface InventoryItem {
    _id:             string;
    itemName:        string;
    stockNumber:     string;
    stockCount:      number;
    status:          string;
    price:           number;
    startDate?:      string;
    endDate?:        string;
    supplierDetails?: {
        supplierId?:   string;
        supplierName?: string;
        phone?:        string;
        address?:      string;
    };
    createdAt:       string;
}

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

const STATUSES = ['In stock', 'Temporarily unavailable', 'Repurchase needed', 'Sold out'] as const;

const statusColor: Record<string, string> = {
    'In stock':                'bg-emerald-500/15 text-emerald-400',
    'Temporarily unavailable': 'bg-blue-500/15 text-blue-400',
    'Repurchase needed':       'bg-amber-500/15 text-amber-400',
    'Sold out':                'bg-red-500/15 text-red-400',
};

const blank = {
    itemName:        '',
    stockNumber:     '',
    stockCount:      '0',
    status:          'In stock',
    price:           '0',
    startDate:       '',
    endDate:         '',
    supplierName:    '',
    supplierPhone:   '',
    supplierAddress: '',
};

export default function InventoryItemsPage() {
    const [rows,    setRows]    = useState<InventoryItem[]>([]);
    const [total,   setTotal]   = useState(0);
    const [page,    setPage]    = useState(1);
    const [search,  setSearch]  = useState('');
    const [status,  setStatus]  = useState('');
    const [loading, setLoading] = useState(true);
    const [modal,   setModal]   = useState(false);
    const [editing, setEditing] = useState<InventoryItem | null>(null);
    const [form,    setForm]    = useState({ ...blank });
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState('');
    const [delId,   setDelId]   = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { page, limit: 15 };
            if (search) params.search = search;
            if (status) params.status = status;
            const { data } = await api.get('/inventory/inventory-items', { params });
            setRows(data.data?.data ?? []);
            setTotal(data.data?.pagination?.total ?? 0);
        } finally { setLoading(false); }
    }, [page, search, status]);

    useEffect(() => { load(); }, [load]);

    const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const openC = () => { setEditing(null); setForm({ ...blank }); setError(''); setModal(true); };
    const openE = (row: InventoryItem) => {
        setEditing(row);
        setForm({
            itemName:        row.itemName,
            stockNumber:     row.stockNumber,
            stockCount:      String(row.stockCount),
            status:          row.status,
            price:           String(row.price),
            startDate:       row.startDate ? row.startDate.slice(0, 10) : '',
            endDate:         row.endDate   ? row.endDate.slice(0, 10)   : '',
            supplierName:    row.supplierDetails?.supplierName ?? '',
            supplierPhone:   row.supplierDetails?.phone        ?? '',
            supplierAddress: row.supplierDetails?.address      ?? '',
        });
        setError(''); setModal(true);
    };

    const save = async () => {
        setSaving(true); setError('');
        try {
            const body = {
                itemName:    form.itemName,
                stockNumber: form.stockNumber,
                stockCount:  Number(form.stockCount),
                status:      form.status,
                price:       Number(form.price),
                startDate:   form.startDate || undefined,
                endDate:     form.endDate   || undefined,
                supplierDetails: {
                    supplierName: form.supplierName   || undefined,
                    phone:        form.supplierPhone  || undefined,
                    address:      form.supplierAddress || undefined,
                },
            };
            if (editing) await api.put(`/inventory/inventory-items/${editing._id}`, body);
            else         await api.post('/inventory/inventory-items', body);
            setModal(false); load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setError(err.response?.data?.message ?? 'Save failed');
        } finally { setSaving(false); }
    };

    const del = async () => {
        if (!delId) return;
        await api.delete(`/inventory/inventory-items/${delId}`);
        setDelId(null); load();
    };

    const pages = Math.ceil(total / 15) || 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Inventory Items</h1>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Spare parts &amp; stock management</p>
                </div>
                <button onClick={openC}
                    className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity">
                    + New Item
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search items…" className={`${iCls} max-w-xs`} />
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={`${iCls} w-56`}>
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[hsl(var(--border))] text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                            {['SKU','Item Name','Stock','Status','Price','Supplier',''].map(h => (
                                <th key={h} className="px-5 py-3">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                        {loading ? (
                            <tr><td colSpan={7} className="py-12 text-center text-[hsl(var(--muted-foreground))]">Loading…</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={7} className="py-12 text-center text-[hsl(var(--muted-foreground))]">No items found</td></tr>
                        ) : rows.map(row => (
                            <tr key={row._id} className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                                <td className="px-5 py-3 font-mono text-xs">{row.stockNumber}</td>
                                <td className="px-5 py-3 font-medium">{row.itemName}</td>
                                <td className="px-5 py-3">{row.stockCount}</td>
                                <td className="px-5 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                        statusColor[row.status] ?? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                                    }`}>{row.status}</span>
                                </td>
                                <td className="px-5 py-3">{row.price} EGP</td>
                                <td className="px-5 py-3 text-[hsl(var(--muted-foreground))]">{row.supplierDetails?.supplierName ?? '—'}</td>
                                <td className="px-5 py-3">
                                    <div className="flex gap-3">
                                        <button onClick={() => openE(row)} className="text-xs font-medium text-[hsl(var(--primary))] hover:underline">Edit</button>
                                        <button onClick={() => setDelId(row._id)} className="text-xs font-medium text-red-400 hover:underline">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
                <div className="flex items-center gap-2 text-sm">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                        className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 disabled:opacity-40">← Prev</button>
                    <span className="text-[hsl(var(--muted-foreground))]">Page {page} / {pages}</span>
                    <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                        className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 disabled:opacity-40">Next →</button>
                </div>
            )}

            {/* Create / Edit Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold">{editing ? 'Edit Item' : 'New Inventory Item'}</h2>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block mb-1 text-xs font-medium">Item Name</label>
                                <input value={form.itemName} onChange={e => u('itemName', e.target.value)} className={iCls} placeholder="e.g. AC Compressor" />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Stock Number (SKU)</label>
                                <input value={form.stockNumber} onChange={e => u('stockNumber', e.target.value.toUpperCase())} className={iCls} placeholder="SKU-001" />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Stock Count</label>
                                <input type="number" min="0" value={form.stockCount} onChange={e => u('stockCount', e.target.value)} className={iCls} />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Status</label>
                                <select value={form.status} onChange={e => u('status', e.target.value)} className={iCls}>
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Price (EGP)</label>
                                <input type="number" min="0" value={form.price} onChange={e => u('price', e.target.value)} className={iCls} />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Start Date</label>
                                <input type="date" value={form.startDate} onChange={e => u('startDate', e.target.value)} className={iCls} />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">End Date</label>
                                <input type="date" value={form.endDate} onChange={e => u('endDate', e.target.value)} className={iCls} />
                            </div>
                        </div>

                        <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] pt-1">Supplier Details</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block mb-1 text-xs font-medium">Supplier Name</label>
                                <input value={form.supplierName} onChange={e => u('supplierName', e.target.value)} className={iCls} placeholder="Supplier Co." />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Phone</label>
                                <input value={form.supplierPhone} onChange={e => u('supplierPhone', e.target.value)} className={iCls} placeholder="+20…" />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Address</label>
                                <input value={form.supplierAddress} onChange={e => u('supplierAddress', e.target.value)} className={iCls} placeholder="City, Country" />
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-400">{error}</p>}

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setModal(false)}
                                className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm">Cancel</button>
                            <button onClick={save} disabled={saving}
                                className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50">
                                {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {delId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl space-y-4">
                        <h2 className="text-lg font-bold">Delete Item?</h2>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDelId(null)}
                                className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm">Cancel</button>
                            <button onClick={del}
                                className="rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
