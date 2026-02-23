'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';

interface WorkOrderRef { _id: string; typeOfOrder?: string; issue?: string; }
interface CustomerRef  { _id: string; name: string; }
interface UserRef      { _id: string; firstName?: string; lastName?: string; name?: string; }

interface Feedback {
    _id: string;
    workOrder:             WorkOrderRef | string;
    customer:              CustomerRef  | string;
    engineer:              UserRef      | string;
    ratingOperation:       number;
    ratingCustomerService: number;
    notes?:                string;
    createdAt:             string;
}

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

const blank = {
    workOrder:             '',
    customer:              '',
    engineer:              '',
    ratingOperation:       '5',
    ratingCustomerService: '5',
    notes:                 '',
};

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function FeedbackPage() {
    const [rows,     setRows]    = useState<Feedback[]>([]);
    const [total,    setTotal]   = useState(0);
    const [page,     setPage]    = useState(1);
    const [search,   setSearch]  = useState('');
    const [loading,  setLoading] = useState(true);
    const [modal,    setModal]   = useState(false);
    const [editing,  setEditing] = useState<Feedback | null>(null);
    const [form,     setForm]    = useState({ ...blank });
    const [saving,   setSaving]  = useState(false);
    const [error,    setError]   = useState('');
    const [delId,    setDelId]   = useState<string | null>(null);

    const [customers,  setCustomers]  = useState<CustomerRef[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrderRef[]>([]);
    const [engineers,  setEngineers]  = useState<UserRef[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { page, limit: 15 };
            if (search) params.search = search;
            const { data } = await api.get('/erp/feedback', { params });
            setRows(data.data?.data ?? []);
            setTotal(data.data?.pagination?.total ?? 0);
        } finally { setLoading(false); }
    }, [page, search]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        api.get('/crm/customers',  { params: { limit: 200 } }).then(r => setCustomers(r.data.data?.data  ?? [])).catch(() => {});
        api.get('/erp/work-orders', { params: { limit: 200 } }).then(r => setWorkOrders(r.data.data?.data ?? [])).catch(() => {});
        api.get('/erp/employees',   { params: { limit: 200 } }).then(r => setEngineers(r.data.data?.data  ?? [])).catch(() => {});
    }, []);

    const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const openC = () => { setEditing(null); setForm({ ...blank }); setError(''); setModal(true); };
    const getId = (ref: WorkOrderRef | CustomerRef | UserRef | string | null | undefined) =>
        ref && typeof ref === 'object' ? ref._id : (ref ?? '');

    const openE = (row: Feedback) => {
        setEditing(row);
        setForm({
            workOrder:             getId(row.workOrder),
            customer:              getId(row.customer),
            engineer:              getId(row.engineer),
            ratingOperation:       String(row.ratingOperation),
            ratingCustomerService: String(row.ratingCustomerService),
            notes:                 row.notes ?? '',
        });
        setError(''); setModal(true);
    };

    const save = async () => {
        setSaving(true); setError('');
        try {
            const body = {
                ...form,
                ratingOperation:       Number(form.ratingOperation),
                ratingCustomerService: Number(form.ratingCustomerService),
            };
            if (editing) await api.put(`/erp/feedback/${editing._id}`, body);
            else         await api.post('/erp/feedback', body);
            setModal(false); load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setError(err.response?.data?.message ?? 'Save failed');
        } finally { setSaving(false); }
    };

    const del = async () => {
        if (!delId) return;
        await api.delete(`/erp/feedback/${delId}`);
        setDelId(null); load();
    };

    const wName = (wo: WorkOrderRef | string | null | undefined) =>
        wo && typeof wo === 'object'
            ? [wo.typeOfOrder, wo.issue].filter(Boolean).join(' — ') || wo._id
            : (wo ?? '—');
    const cName = (c: CustomerRef | string | null | undefined) => c && typeof c === 'object' ? c.name : (c ?? '—');
    const eName = (e: UserRef     | string | null | undefined) =>
        e && typeof e === 'object'
            ? ((e.firstName || '') + ' ' + (e.lastName || '')).trim() || e.name || e._id
            : (e ?? '—');

    const pages = Math.ceil(total / 15) || 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Feedback</h1>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Post-service quality ratings · auto-updates EmployeeEvaluation</p>
                </div>
                <button onClick={openC}
                    className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity">
                    + New Feedback
                </button>
            </div>

            {/* Filters */}
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search…" className={`${iCls} max-w-xs`} />

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[hsl(var(--border))] text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                            {['Work Order','Customer','Engineer','Op Rating','CS Rating','Notes',''].map(h => (
                                <th key={h} className="px-5 py-3">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                        {loading ? (
                            <tr><td colSpan={7} className="py-12 text-center text-[hsl(var(--muted-foreground))]">Loading…</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={7} className="py-12 text-center text-[hsl(var(--muted-foreground))]">No feedback found</td></tr>
                        ) : rows.map(row => (
                            <tr key={row._id} className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                                <td className="px-5 py-3 font-mono text-xs">{wName(row.workOrder)}</td>
                                <td className="px-5 py-3">{cName(row.customer)}</td>
                                <td className="px-5 py-3">{eName(row.engineer)}</td>
                                <td className="px-5 py-3 text-amber-400 text-base">{stars(row.ratingOperation)}</td>
                                <td className="px-5 py-3 text-amber-400 text-base">{stars(row.ratingCustomerService)}</td>
                                <td className="px-5 py-3 max-w-[180px] truncate text-[hsl(var(--muted-foreground))]">{row.notes ?? '—'}</td>
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
                    <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold">{editing ? 'Edit Feedback' : 'New Feedback'}</h2>

                        <div className="space-y-3">
                            <div>
                                <label className="block mb-1 text-xs font-medium">Work Order</label>
                                <select value={form.workOrder} onChange={e => u('workOrder', e.target.value)} className={iCls}>
                                    <option value="">— select —</option>
                                    {workOrders.map(w => <option key={w._id} value={w._id}>{[w.typeOfOrder, w.issue].filter(Boolean).join(' — ') || w._id}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Customer</label>
                                <select value={form.customer} onChange={e => u('customer', e.target.value)} className={iCls}>
                                    <option value="">— select —</option>
                                    {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Engineer</label>
                                <select value={form.engineer} onChange={e => u('engineer', e.target.value)} className={iCls}>
                                    <option value="">— select —</option>
                                    {engineers.map(e => <option key={e._id} value={e._id}>{((e.firstName || '') + ' ' + (e.lastName || '')).trim() || e.name || e._id}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Rating — Operation Quality (1–5)</label>
                                <select value={form.ratingOperation} onChange={e => u('ratingOperation', e.target.value)} className={iCls}>
                                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{stars(n)} ({n})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Rating — Customer Service (1–5)</label>
                                <select value={form.ratingCustomerService} onChange={e => u('ratingCustomerService', e.target.value)} className={iCls}>
                                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{stars(n)} ({n})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">Notes</label>
                                <textarea rows={3} value={form.notes} onChange={e => u('notes', e.target.value)}
                                    className={iCls} placeholder="Customer comments…" />
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
                        <h2 className="text-lg font-bold">Delete Feedback?</h2>
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
