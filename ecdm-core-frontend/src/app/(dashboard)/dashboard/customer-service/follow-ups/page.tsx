'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useT } from '@/i18n/useT';

interface WorkOrderRef { _id: string; typeOfOrder?: string; issue?: string; }
interface CustomerRef  { _id: string; name: string; }
interface UserRef      { _id: string; firstName?: string; lastName?: string; name?: string; }

interface FollowUp {
    _id: string;
    workOrder:           WorkOrderRef | string;
    customer:            CustomerRef  | string;
    csr:                 UserRef      | string;
    solvedIssue:         boolean;
    reasonForNotSolving?: string;
    followUpDate:        string;
    notes?:              string;
    createdAt:           string;
}

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

const blank = {
    workOrder:           '',
    customer:            '',
    csr:                 '',
    solvedIssue:         'true',
    reasonForNotSolving: '',
    followUpDate:        '',
    notes:               '',
};

export default function FollowUpsPage() {
    const t = useT();
    const [rows,     setRows]    = useState<FollowUp[]>([]);
    const [total,    setTotal]   = useState(0);
    const [page,     setPage]    = useState(1);
    const [search,   setSearch]  = useState('');
    const [solved,   setSolved]  = useState('');
    const [loading,  setLoading] = useState(true);
    const [modal,    setModal]   = useState(false);
    const [editing,  setEditing] = useState<FollowUp | null>(null);
    const [form,     setForm]    = useState({ ...blank });
    const [saving,   setSaving]  = useState(false);
    const [error,    setError]   = useState('');
    const [delId,    setDelId]   = useState<string | null>(null);

    const [customers,  setCustomers]  = useState<CustomerRef[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrderRef[]>([]);
    const [users,      setUsers]      = useState<UserRef[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { page, limit: 15 };
            if (search) params.search = search;
            if (solved !== '') params.solvedIssue = solved;
            const { data } = await api.get('/erp/follow-ups', { params });
            setRows(data.data?.data ?? []);
            setTotal(data.data?.pagination?.total ?? 0);
        } finally { setLoading(false); }
    }, [page, search, solved]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        api.get('/crm/customers',  { params: { limit: 200 } }).then(r => setCustomers(r.data.data?.data  ?? [])).catch(() => {});
        api.get('/erp/work-orders', { params: { limit: 200 } }).then(r => setWorkOrders(r.data.data?.data ?? [])).catch(() => {});
        api.get('/erp/employees',   { params: { limit: 200 } }).then(r => setUsers(r.data.data?.data      ?? [])).catch(() => {});
    }, []);

    const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const openC = () => { setEditing(null); setForm({ ...blank }); setError(''); setModal(true); };
    const getId = (ref: WorkOrderRef | CustomerRef | UserRef | string | null | undefined) =>
        ref && typeof ref === 'object' ? ref._id : (ref ?? '');

    const openE = (row: FollowUp) => {
        setEditing(row);
        setForm({
            workOrder:           getId(row.workOrder),
            customer:            getId(row.customer),
            csr:                 getId(row.csr),
            solvedIssue:         String(row.solvedIssue),
            reasonForNotSolving: row.reasonForNotSolving ?? '',
            followUpDate:        row.followUpDate ? row.followUpDate.slice(0, 10) : '',
            notes:               row.notes ?? '',
        });
        setError(''); setModal(true);
    };

    const save = async () => {
        setSaving(true); setError('');
        try {
            const body = {
                ...form,
                solvedIssue: form.solvedIssue === 'true',
            };
            if (editing) await api.put(`/erp/follow-ups/${editing._id}`, body);
            else         await api.post('/erp/follow-ups', body);
            setModal(false); load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setError(err.response?.data?.message ?? 'Save failed');
        } finally { setSaving(false); }
    };

    const del = async () => {
        if (!delId) return;
        await api.delete(`/erp/follow-ups/${delId}`);
        setDelId(null); load();
    };

    const wName = (wo: WorkOrderRef | string | null | undefined) =>
        wo && typeof wo === 'object'
            ? [wo.typeOfOrder, wo.issue].filter(Boolean).join(' — ') || wo._id
            : (wo ?? '—');
    const cName = (c: CustomerRef | string | null | undefined) =>
        c && typeof c === 'object' ? c.name : (c ?? '—');
    const uName = (usr: UserRef | string | null | undefined) =>
        usr && typeof usr === 'object'
            ? ((usr.firstName || '') + ' ' + (usr.lastName || '')).trim() || usr.name || usr._id
            : (usr ?? '—');

    const pages = Math.ceil(total / 15) || 1;

    const tableHeaders = [t.common.workOrder, t.common.customer, t.common.csr, t.common.solved, t.pages.followUps.followUpDate, t.common.reason, ''];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t.pages.followUps.title}</h1>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{t.pages.followUps.subtitle}</p>
                </div>
                <button onClick={openC}
                    className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity">
                    {t.pages.followUps.addBtn}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder={t.common.search} className={`${iCls} max-w-xs`} />
                <select value={solved} onChange={e => { setSolved(e.target.value); setPage(1); }} className={`${iCls} w-48`}>
                    <option value="">{t.pages.followUps.all}</option>
                    <option value="true">{t.pages.followUps.solvedLabel}</option>
                    <option value="false">{t.pages.followUps.unresolvedLabel}</option>
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[hsl(var(--border))] text-start text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                            {tableHeaders.map((h, i) => (
                                <th key={i} className="px-5 py-3">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                        {loading ? (
                            <tr><td colSpan={7} className="py-12 text-center text-[hsl(var(--muted-foreground))]">{t.common.loading}</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={7} className="py-12 text-center text-[hsl(var(--muted-foreground))]">{t.pages.followUps.emptyState}</td></tr>
                        ) : rows.map(row => (
                            <tr key={row._id} className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                                <td className="px-5 py-3 text-xs">{wName(row.workOrder)}</td>
                                <td className="px-5 py-3">{cName(row.customer)}</td>
                                <td className="px-5 py-3">{uName(row.csr)}</td>
                                <td className="px-5 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                        row.solvedIssue
                                            ? 'bg-emerald-500/15 text-emerald-400'
                                            : 'bg-red-500/15 text-red-400'
                                    }`}>{row.solvedIssue ? t.pages.followUps.solvedLabel : t.pages.followUps.unresolvedLabel}</span>
                                </td>
                                <td className="px-5 py-3">{row.followUpDate ? new Date(row.followUpDate).toLocaleDateString() : '—'}</td>
                                <td className="px-5 py-3 max-w-[220px] text-xs text-[hsl(var(--muted-foreground))]">
                                    {row.notes && <div className="truncate">{row.notes}</div>}
                                    {!row.solvedIssue && row.reasonForNotSolving && (
                                        <div className="mt-0.5 text-red-400 truncate" title={row.reasonForNotSolving}>
                                            {t.pages.followUps.reasonNotSolving}: {row.reasonForNotSolving}
                                        </div>
                                    )}
                                    {!row.notes && !row.reasonForNotSolving && '—'}
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex gap-3">
                                        <button onClick={() => openE(row)} className="text-xs font-medium text-[hsl(var(--primary))] hover:underline">{t.common.edit}</button>
                                        <button onClick={() => setDelId(row._id)} className="text-xs font-medium text-red-400 hover:underline">{t.common.delete}</button>
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
                        className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 disabled:opacity-40">{t.common.prev}</button>
                    <span className="text-[hsl(var(--muted-foreground))]">{t.common.page} {page} / {pages}</span>
                    <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                        className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 disabled:opacity-40">{t.common.next}</button>
                </div>
            )}

            {/* Create / Edit Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold">{editing ? t.common.edit : t.common.create}</h2>

                        <div className="space-y-3">
                            <div>
                                <label className="block mb-1 text-xs font-medium">{t.common.workOrder}</label>
                                <select value={form.workOrder} onChange={e => u('workOrder', e.target.value)} className={iCls}>
                                    <option value="">{t.common.select}</option>
                                    {workOrders.map(w => <option key={w._id} value={w._id}>{[w.typeOfOrder, w.issue].filter(Boolean).join(' — ') || w._id}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">{t.common.customer}</label>
                                <select value={form.customer} onChange={e => u('customer', e.target.value)} className={iCls}>
                                    <option value="">{t.common.select}</option>
                                    {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">{t.common.csr}</label>
                                <select value={form.csr} onChange={e => u('csr', e.target.value)} className={iCls}>
                                    <option value="">{t.common.select}</option>
                                    {users.map(usr => <option key={usr._id} value={usr._id}>{((usr.firstName || '') + ' ' + (usr.lastName || '')).trim() || usr.name || usr._id}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">{t.pages.followUps.issueSolved}</label>
                                <select value={form.solvedIssue} onChange={e => u('solvedIssue', e.target.value)} className={iCls}>
                                    <option value="true">{t.pages.followUps.yesSolved}</option>
                                    <option value="false">{t.pages.followUps.noUnresolved}</option>
                                </select>
                            </div>
                            {form.solvedIssue === 'false' && (
                                <div>
                                    <label className="block mb-1 text-xs font-medium">{t.pages.followUps.reasonNotSolving}</label>
                                    <textarea rows={3} value={form.reasonForNotSolving}
                                        onChange={e => u('reasonForNotSolving', e.target.value)}
                                        className={iCls} placeholder={t.pages.followUps.reasonPlaceholder} />
                                </div>
                            )}
                            <div>
                                <label className="block mb-1 text-xs font-medium">{t.pages.followUps.followUpDate}</label>
                                <input type="date" value={form.followUpDate} onChange={e => u('followUpDate', e.target.value)} className={iCls} />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium">{t.common.notes}</label>
                                <textarea rows={3} value={form.notes} onChange={e => u('notes', e.target.value)}
                                    className={iCls} placeholder={t.pages.followUps.notesPlaceholder} />
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-400">{error}</p>}

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setModal(false)}
                                className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm">{t.common.cancel}</button>
                            <button onClick={save} disabled={saving}
                                className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50">
                                {saving ? t.common.saving : (editing ? t.common.save : t.common.create)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {delId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl space-y-4">
                        <h2 className="text-lg font-bold">{t.pages.followUps.deleteTitle}</h2>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{t.common.cannotUndo}</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDelId(null)}
                                className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm">{t.common.cancel}</button>
                            <button onClick={del}
                                className="rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600">{t.common.delete}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
