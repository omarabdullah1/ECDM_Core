'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { FolderTree, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/i18n/useT';

interface Category { _id: string; name: string; description?: string; parentCategory?: { _id: string; name: string }; isActive: boolean; }
const inputCls = cn('w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all');

export default function CategoriesPage() {
    const t = useT();
    const [rows, setRows] = useState<Category[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [form, setForm] = useState({ name: '', description: '', parentCategory: '', isActive: true });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [delId, setDelId] = useState<string | null>(null);
    const [allCats, setAllCats] = useState<{ _id: string; name: string }[]>([]);
    const lim = 20; const tp = Math.ceil(total / lim);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const p: Record<string, string | number> = { page, limit: lim };
            if (search) p.search = search;
            const { data } = await api.get('/inventory/categories', { params: p });
            setRows(data.data.data); setTotal(data.data.pagination.total);
        } catch { /* */ }
        setLoading(false);
    }, [page, search]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { api.get('/inventory/categories', { params: { limit: 200 } }).then(r => setAllCats(r.data.data.data)).catch(() => { }); }, []);

    const openC = () => { setEditing(null); setForm({ name: '', description: '', parentCategory: '', isActive: true }); setModal(true); };
    const openE = (c: Category) => { setEditing(c); setForm({ name: c.name, description: c.description || '', parentCategory: c.parentCategory?._id || '', isActive: c.isActive }); setModal(true); };

    const save = async (ev: React.FormEvent) => {
        ev.preventDefault(); setSaving(true); setError('');
        const pl: Record<string, unknown> = { name: form.name, isActive: form.isActive };
        if (form.description) pl.description = form.description;
        if (form.parentCategory) pl.parentCategory = form.parentCategory; else pl.parentCategory = null;
        try { if (editing) await api.put(`/inventory/categories/${editing._id}`, pl); else await api.post('/inventory/categories', pl); setModal(false); fetchData(); }
        catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
        setSaving(false);
    };
    const del = async () => { if (!delId) return; try { await api.delete(`/inventory/categories/${delId}`); fetchData(); } catch { } setDelId(null); };

    return (<div className="space-y-6">
        <div className="flex items-center justify-between">
            <div><h1 className="text-2xl font-bold flex items-center gap-3"><FolderTree size={24} className="text-teal-400" /> {t.pages.categories.title}</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{t.pages.categories.subtitle} ({total} {t.common.total})</p></div>
            <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"><Plus size={16} /> {t.pages.categories.addBtn}</button>
        </div>
        <div className="flex gap-3 flex-wrap">
            <div className="relative w-64"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input type="text" placeholder={t.pages.categories.searchPlaceholder} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={cn(inputCls, 'ps-10')} /></div>
        </div>
        <div className="glass-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[hsl(var(--border))] text-start text-[hsl(var(--muted-foreground))]"><th className="px-4 py-3 font-medium">{t.common.name}</th><th className="px-4 py-3 font-medium">{t.pages.categories.parentCategory}</th><th className="px-4 py-3 font-medium">{t.common.status}</th><th className="px-4 py-3 font-medium text-end">{t.common.actions}</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={4} className="px-4 py-12 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] mx-auto" /></td></tr>
                : rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.pages.categories.emptyState}</td></tr>
                    : rows.map(c => <tr key={c._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{c.parentCategory?.name || '—'}</td>
                        <td className="px-4 py-3"><span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', c.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-500/15 text-gray-400')}>{c.isActive ? t.pages.categories.isActive : t.common.no}</span></td>
                        <td className="px-4 py-3 text-end"><div className="flex items-center justify-end gap-1"><button onClick={() => openE(c)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all"><Edit2 size={15} /></button><button onClick={() => setDelId(c._id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all"><Trash2 size={15} /></button></div></td>
                    </tr>)}</tbody></table></div>
            {tp > 1 && <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3"><p className="text-xs text-[hsl(var(--muted-foreground))]">{t.common.page} {page} {t.common.of} {tp}</p><div className="flex gap-1"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronLeft size={16} /></button><button onClick={() => setPage(Math.min(tp, page + 1))} disabled={page >= tp} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}</div>

        {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}><div className="glass-card w-full max-w-md p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold">{editing ? t.common.edit : t.pages.categories.addBtn}</h3><button onClick={() => setModal(false)} className="rounded-lg p-1 hover:bg-[hsl(var(--secondary))]"><X size={18} /></button></div>
            <form onSubmit={save} className="space-y-4">
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.name} *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className={inputCls} /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.description}</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={cn(inputCls, 'resize-none')} /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.categories.parentCategory}</label><select value={form.parentCategory} onChange={e => setForm(p => ({ ...p, parentCategory: e.target.value }))} className={inputCls}><option value="">{t.pages.categories.noneRoot}</option>{allCats.filter(c => c._id !== editing?._id).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                <div className="flex items-center gap-2"><input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="rounded" /><label htmlFor="isActive" className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.categories.isActive}</label></div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">{t.common.cancel}</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : editing ? t.common.update : t.common.create}</button></div>
            </form></div></div>}

        {delId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDelId(null)}><div className="glass-card w-full max-w-sm p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4"><Trash2 size={22} className="text-red-400" /></div>
            <h3 className="text-lg font-bold text-center">{t.pages.categories.deleteTitle}</h3><p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">{t.pages.categories.deleteMsg}</p>
            <div className="flex gap-3 mt-6"><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">{t.common.cancel}</button><button onClick={del} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all">{t.common.delete}</button></div>
        </div></div>}
    </div>);
}
