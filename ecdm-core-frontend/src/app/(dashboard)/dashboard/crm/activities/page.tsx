'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { CalendarCheck, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight, Phone, Mail, MessageSquare, StickyNote, MoreHorizontal } from 'lucide-react';

interface Activity { _id: string; type: string; subject: string; description?: string; relatedClient?: { companyName: string }; relatedLead?: { title: string }; performedBy?: { firstName: string; lastName: string }; date: string; duration?: number; }

const TYPE_META: Record<string, { color: string; Icon: typeof Phone }> = { Call: { color: 'bg-blue-500/15 text-blue-400', Icon: Phone }, Email: { color: 'bg-amber-500/15 text-amber-400', Icon: Mail }, Meeting: { color: 'bg-purple-500/15 text-purple-400', Icon: CalendarCheck }, Note: { color: 'bg-emerald-500/15 text-emerald-400', Icon: StickyNote }, Other: { color: 'bg-gray-500/15 text-gray-400', Icon: MoreHorizontal } };
const inputCls = cn('w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm', 'placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]', 'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all');

export default function ActivitiesPage() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Activity | null>(null);
    const [form, setForm] = useState({ type: 'Call', subject: '', description: '', date: '', duration: '', relatedClient: '', relatedLead: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [clientsList, setClientsList] = useState<{ _id: string; companyName: string }[]>([]);
    const [leadsList, setLeadsList] = useState<{ _id: string; title: string }[]>([]);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (search) params.search = search;
            if (filterType) params.type = filterType;
            const { data } = await api.get('/crm/activities', { params });
            setActivities(data.data.data); setTotal(data.data.pagination.total);
        } catch { /* */ }
        setLoading(false);
    }, [page, search, filterType]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        api.get('/crm/clients', { params: { limit: 100 } }).then(r => setClientsList(r.data.data.data)).catch(() => { });
        api.get('/crm/leads', { params: { limit: 100 } }).then(r => setLeadsList(r.data.data.data)).catch(() => { });
    }, []);

    const openCreate = () => { setEditing(null); setForm({ type: 'Call', subject: '', description: '', date: '', duration: '', relatedClient: '', relatedLead: '' }); setShowModal(true); };
    const openEdit = (a: Activity) => { setEditing(a); setForm({ type: a.type, subject: a.subject, description: a.description || '', date: a.date ? a.date.split('T')[0] : '', duration: a.duration?.toString() || '', relatedClient: (a.relatedClient as unknown as { _id: string })?._id || '', relatedLead: (a.relatedLead as unknown as { _id: string })?._id || '' }); setShowModal(true); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError('');
        const payload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(form)) { if (v !== '') payload[k] = k === 'duration' ? Number(v) : v; }
        try {
            if (editing) await api.put(`/crm/activities/${editing._id}`, payload);
            else await api.post('/crm/activities', payload);
            setShowModal(false); fetchData();
        } catch (err: unknown) { setError((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save'); }
        setSaving(false);
    };

    const confirmDelete = async () => { if (!deleteId) return; try { await api.delete(`/crm/activities/${deleteId}`); fetchData(); } catch { /* */ } setDeleteId(null); };
    const update = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3"><MessageSquare size={24} className="text-amber-400" /> Activities</h1>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Track calls, emails, meetings and notes ({total} total)</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"><Plus size={16} /> Log Activity</button>
            </div>

            <div className="flex gap-3 flex-wrap">
                <div className="relative w-64"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input type="text" placeholder="Search activities..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={cn(inputCls, 'pl-10')} /></div>
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className={cn(inputCls, 'w-44')}>
                    <option value="">All Types</option>
                    {['Call', 'Email', 'Meeting', 'Note', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-[hsl(var(--border))] text-left text-[hsl(var(--muted-foreground))]">
                            <th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Subject</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Duration</th><th className="px-4 py-3 font-medium">Performed By</th><th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr></thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-4 py-12 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] mx-auto" /></td></tr>
                            ) : activities.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">No activities found. Click &quot;Log Activity&quot; to create one.</td></tr>
                            ) : activities.map(a => {
                                const meta = TYPE_META[a.type] || TYPE_META.Other;
                                const Icon = meta.Icon;
                                return (
                                    <tr key={a._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                                        <td className="px-4 py-3"><span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', meta.color)}><Icon size={12} />{a.type}</span></td>
                                        <td className="px-4 py-3 font-medium">{a.subject}</td>
                                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{fmtDate(a.date)}</td>
                                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{a.duration ? `${a.duration} min` : '—'}</td>
                                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{a.performedBy ? `${a.performedBy.firstName} ${a.performedBy.lastName}` : '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(a)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all"><Edit2 size={15} /></button>
                                                <button onClick={() => setDeleteId(a._id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all"><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3">
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Page {page} of {totalPages}</p>
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
                        <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold">{editing ? 'Edit Activity' : 'Log Activity'}</h3><button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-[hsl(var(--secondary))]"><X size={18} /></button></div>
                        <form onSubmit={handleSave} className="space-y-4">
                            {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Type *</label><select value={form.type} onChange={update('type')} className={inputCls}>{['Call', 'Email', 'Meeting', 'Note', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Date</label><input type="date" value={form.date} onChange={update('date')} className={inputCls} /></div>
                            </div>
                            <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Subject *</label><input value={form.subject} onChange={update('subject')} required className={inputCls} placeholder="Follow-up call with client" /></div>
                            <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Description</label><textarea value={form.description} onChange={update('description')} rows={3} className={cn(inputCls, 'resize-none')} placeholder="Activity details..." /></div>
                            <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Duration (minutes)</label><input type="number" value={form.duration} onChange={update('duration')} className={inputCls} placeholder="30" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Related Client</label><select value={form.relatedClient} onChange={update('relatedClient')} className={inputCls}><option value="">— None —</option>{clientsList.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}</select></div>
                                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Related Lead</label><select value={form.relatedLead} onChange={update('relatedLead')} className={inputCls}><option value="">— None —</option>{leadsList.map(l => <option key={l._id} value={l._id}>{l.title}</option>)}</select></div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : editing ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
                    <div className="glass-card w-full max-w-sm p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4"><Trash2 size={22} className="text-red-400" /></div>
                        <h3 className="text-lg font-bold text-center">Delete Activity?</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">This action cannot be undone.</p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
