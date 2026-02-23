'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Target, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/i18n/useT';

interface Lead { _id: string; title: string; contactName: string; email?: string; phone?: string; company?: string; source: string; status: string; value?: number; createdAt: string; }

const STATUS_COLORS: Record<string, string> = { New: 'bg-blue-500/15 text-blue-400', Contacted: 'bg-amber-500/15 text-amber-400', Qualified: 'bg-purple-500/15 text-purple-400', Proposal: 'bg-indigo-500/15 text-indigo-400', Won: 'bg-emerald-500/15 text-emerald-400', Lost: 'bg-red-500/15 text-red-400' };
const inputCls = cn('w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm', 'placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]', 'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all');

export default function LeadsPage() {
    const t = useT();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Lead | null>(null);
    const [form, setForm] = useState({ title: '', contactName: '', email: '', phone: '', company: '', source: 'Other', status: 'New', value: '', assignedTo: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [employees, setEmployees] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (search) params.search = search;
            if (filterStatus) params.status = filterStatus;
            const { data } = await api.get('/crm/leads', { params });
            setLeads(data.data.data); setTotal(data.data.pagination.total);
        } catch { /* ignore */ }
        setLoading(false);
    }, [page, search, filterStatus]);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    useEffect(() => {
        api.get('/erp/employees', { params: { limit: 100 } }).then(r => setEmployees(r.data.data.data)).catch(() => { });
    }, []);

    const openCreate = () => { setEditing(null); setForm({ title: '', contactName: '', email: '', phone: '', company: '', source: 'Other', status: 'New', value: '', assignedTo: '' }); setShowModal(true); };
    const openEdit = (l: Lead) => { setEditing(l); setForm({ title: l.title, contactName: l.contactName, email: l.email || '', phone: l.phone || '', company: l.company || '', source: l.source, status: l.status, value: l.value?.toString() || '', assignedTo: (l as unknown as { assignedTo?: { _id: string } }).assignedTo?._id || '' }); setShowModal(true); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError('');
        const payload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(form)) { if (v !== '') payload[k] = k === 'value' ? Number(v) : v; }
        try {
            if (editing) await api.put(`/crm/leads/${editing._id}`, payload);
            else await api.post('/crm/leads', payload);
            setShowModal(false); fetchLeads();
        } catch (err: unknown) { setError((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save'); }
        setSaving(false);
    };

    const confirmDelete = async () => { if (!deleteId) return; try { await api.delete(`/crm/leads/${deleteId}`); fetchLeads(); } catch { /* */ } setDeleteId(null); };
    const update = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [f]: e.target.value }));
    const fmt = (v?: number) => v ? `$${v.toLocaleString()}` : '—';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3"><Target size={24} className="text-purple-400" /> {t.pages.leads.title}</h1>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{t.pages.leads.subtitle} ({total} {t.common.total})</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"><Plus size={16} /> {t.pages.leads.addBtn}</button>
            </div>

            <div className="flex gap-3 flex-wrap">
                <div className="relative w-64">
                    <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input type="text" placeholder={t.pages.leads.searchPlaceholder} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={cn(inputCls, 'ps-10')} />
                </div>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={cn(inputCls, 'w-44')}>
                    <option value="">{t.common.allStatuses}</option>
                    {['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-[hsl(var(--border))] text-start text-[hsl(var(--muted-foreground))]">
                            <th className="px-4 py-3 font-medium">{t.pages.leads.title_}</th><th className="px-4 py-3 font-medium">{t.pages.leads.contact}</th><th className="px-4 py-3 font-medium">{t.pages.leads.company}</th><th className="px-4 py-3 font-medium">{t.pages.leads.source}</th><th className="px-4 py-3 font-medium">{t.common.status}</th><th className="px-4 py-3 font-medium">{t.pages.leads.value}</th><th className="px-4 py-3 font-medium text-end">{t.common.actions}</th>
                        </tr></thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] mx-auto" /></td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.pages.leads.emptyState}</td></tr>
                            ) : leads.map(l => (
                                <tr key={l._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                                    <td className="px-4 py-3 font-medium">{l.title}</td>
                                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{l.contactName}</td>
                                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{l.company || '—'}</td>
                                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{l.source}</td>
                                    <td className="px-4 py-3"><span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', STATUS_COLORS[l.status])}>{l.status}</span></td>
                                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{fmt(l.value)}</td>
                                    <td className="px-4 py-3 text-end">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(l)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all"><Edit2 size={15} /></button>
                                            <button onClick={() => setDeleteId(l._id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3">
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{t.common.page} {page} {t.common.of} {totalPages}</p>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronLeft size={16} /></button>
                            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="glass-card w-full max-w-lg p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold">{editing ? t.common.edit : t.pages.leads.addBtn}</h3><button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-[hsl(var(--secondary))]"><X size={18} /></button></div>
                        <form onSubmit={handleSave} className="space-y-4">
                            {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
                            <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.leads.title_} *</label><input value={form.title} onChange={update('title')} required className={inputCls} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.leads.contact} *</label><input value={form.contactName} onChange={update('contactName')} required className={inputCls} /></div>
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.leads.company}</label><input value={form.company} onChange={update('company')} className={inputCls} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.email}</label><input type="email" value={form.email} onChange={update('email')} className={inputCls} /></div>
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.phone}</label><input value={form.phone} onChange={update('phone')} className={inputCls} /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.leads.source}</label><select value={form.source} onChange={update('source')} className={inputCls}>{['Web', 'Referral', 'Cold Call', 'Social', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.status}</label><select value={form.status} onChange={update('status')} className={inputCls}>{['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.leads.value} ($)</label><input type="number" value={form.value} onChange={update('value')} className={inputCls} placeholder="10000" /></div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.engineer}</label>
                                <select value={form.assignedTo} onChange={update('assignedTo')} className={inputCls}>
                                    <option value="">{t.common.none}</option>
                                    {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">{t.common.cancel}</button>
                                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : editing ? t.common.update : t.common.create}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
                    <div className="glass-card w-full max-w-sm p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4"><Trash2 size={22} className="text-red-400" /></div>
                        <h3 className="text-lg font-bold text-center">{t.pages.leads.deleteTitle}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">{t.common.cannotUndo}</p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">{t.common.cancel}</button>
                            <button onClick={confirmDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all">{t.common.delete}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
