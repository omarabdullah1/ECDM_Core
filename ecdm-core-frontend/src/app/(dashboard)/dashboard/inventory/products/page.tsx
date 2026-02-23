'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Package, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useT } from '@/i18n/useT';

interface Product { _id: string; sku: string; name: string; description?: string; category?: { _id: string; name: string }; unitPrice: number; costPrice?: number; currentStock: number; lowStockThreshold: number; unit: string; stockStatus: string; isActive: boolean; }
const STOCK_C: Record<string, string> = { 'In Stock': 'bg-emerald-500/15 text-emerald-400', 'Low Stock': 'bg-amber-500/15 text-amber-400', 'Out of Stock': 'bg-red-500/15 text-red-400' };
const inputCls = cn('w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all');
const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function ProductsPage() {
    const t = useT();
    const [rows, setRows] = useState<Product[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [lowStock, setLowStock] = useState(false);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [form, setForm] = useState({ sku: '', name: '', description: '', category: '', unitPrice: '', costPrice: '', currentStock: '0', lowStockThreshold: '10', unit: 'pcs' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [delId, setDelId] = useState<string | null>(null);
    const [cats, setCats] = useState<{ _id: string; name: string }[]>([]);
    const lim = 20; const tp = Math.ceil(total / lim);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const p: Record<string, string | number | boolean> = { page, limit: lim };
            if (search) p.search = search;
            if (lowStock) p.lowStock = 'true';
            const { data } = await api.get('/inventory/products', { params: p });
            setRows(data.data.data); setTotal(data.data.pagination.total);
        } catch { /* */ }
        setLoading(false);
    }, [page, search, lowStock]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { api.get('/inventory/categories', { params: { limit: 200 } }).then(r => setCats(r.data.data.data)).catch(() => { }); }, []);

    const openC = () => { setEditing(null); setForm({ sku: '', name: '', description: '', category: '', unitPrice: '', costPrice: '', currentStock: '0', lowStockThreshold: '10', unit: 'pcs' }); setModal(true); };
    const openE = (p: Product) => { setEditing(p); setForm({ sku: p.sku, name: p.name, description: p.description || '', category: p.category?._id || '', unitPrice: p.unitPrice.toString(), costPrice: p.costPrice?.toString() || '', currentStock: p.currentStock.toString(), lowStockThreshold: p.lowStockThreshold.toString(), unit: p.unit }); setModal(true); };
    const update = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

    const save = async (ev: React.FormEvent) => {
        ev.preventDefault(); setSaving(true); setError('');
        const pl: Record<string, unknown> = { sku: form.sku, name: form.name, unitPrice: Number(form.unitPrice), unit: form.unit, lowStockThreshold: Number(form.lowStockThreshold) };
        if (form.description) pl.description = form.description;
        if (form.category) pl.category = form.category;
        if (form.costPrice) pl.costPrice = Number(form.costPrice);
        if (!editing) pl.currentStock = Number(form.currentStock);
        try { if (editing) await api.put(`/inventory/products/${editing._id}`, pl); else await api.post('/inventory/products', pl); setModal(false); fetchData(); }
        catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
        setSaving(false);
    };
    const del = async () => { if (!delId) return; try { await api.delete(`/inventory/products/${delId}`); fetchData(); } catch { } setDelId(null); };

    return (<div className="space-y-6">
        <div className="flex items-center justify-between">
            <div><h1 className="text-2xl font-bold flex items-center gap-3"><Package size={24} className="text-indigo-400" /> {t.pages.products.title}</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{t.pages.products.subtitle} ({total} {t.common.total})</p></div>
            <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"><Plus size={16} /> {t.pages.products.addBtn}</button>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
            <div className="relative w-64"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input type="text" placeholder={t.pages.products.searchPlaceholder} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={cn(inputCls, 'ps-10')} /></div>
            <button onClick={() => { setLowStock(!lowStock); setPage(1); }} className={cn('flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all', lowStock ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]')}><AlertTriangle size={14} /> {t.pages.products.lowStock}</button>
        </div>

        <div className="glass-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[hsl(var(--border))] text-start text-[hsl(var(--muted-foreground))]"><th className="px-4 py-3 font-medium">{t.common.sku}</th><th className="px-4 py-3 font-medium">{t.common.name}</th><th className="px-4 py-3 font-medium">{t.pages.products.category}</th><th className="px-4 py-3 font-medium text-end">{t.common.price}</th><th className="px-4 py-3 font-medium text-end">{t.common.stock}</th><th className="px-4 py-3 font-medium">{t.common.status}</th><th className="px-4 py-3 font-medium text-end">{t.common.actions}</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={7} className="px-4 py-12 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] mx-auto" /></td></tr>
                : rows.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.pages.products.emptyState}</td></tr>
                    : rows.map(p => <tr key={p._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{p.category?.name || '—'}</td>
                        <td className="px-4 py-3 text-end">{money(p.unitPrice)}</td>
                        <td className="px-4 py-3 text-end font-semibold">{p.currentStock} {p.unit}</td>
                        <td className="px-4 py-3"><span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', STOCK_C[p.stockStatus] || STOCK_C['In Stock'])}>{p.stockStatus}</span></td>
                        <td className="px-4 py-3 text-end"><div className="flex items-center justify-end gap-1"><button onClick={() => openE(p)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all"><Edit2 size={15} /></button><button onClick={() => setDelId(p._id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all"><Trash2 size={15} /></button></div></td>
                    </tr>)}</tbody></table></div>
            {tp > 1 && <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3"><p className="text-xs text-[hsl(var(--muted-foreground))]">{t.common.page} {page} {t.common.of} {tp}</p><div className="flex gap-1"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronLeft size={16} /></button><button onClick={() => setPage(Math.min(tp, page + 1))} disabled={page >= tp} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}</div>

        {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}><div className="glass-card w-full max-w-lg p-6 animate-fade-in bg-[hsl(var(--card))] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold">{editing ? t.common.edit : t.pages.products.addBtn}</h3><button onClick={() => setModal(false)} className="rounded-lg p-1 hover:bg-[hsl(var(--secondary))]"><X size={18} /></button></div>
            <form onSubmit={save} className="space-y-4">
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.sku} *</label><input value={form.sku} onChange={update('sku')} required className={cn(inputCls, 'uppercase font-mono')} placeholder="PROD-001" /></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.products.category}</label><select value={form.category} onChange={update('category')} className={inputCls}><option value="">{t.common.none}</option>{cats.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                </div>
                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.name} *</label><input value={form.name} onChange={update('name')} required className={inputCls} /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.description}</label><textarea value={form.description} onChange={update('description')} rows={2} className={cn(inputCls, 'resize-none')} /></div>
                <div className="grid grid-cols-3 gap-3">
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.products.unitPrice} *</label><input type="number" value={form.unitPrice} onChange={update('unitPrice')} required min={0} step={0.01} className={inputCls} /></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.products.costPrice}</label><input type="number" value={form.costPrice} onChange={update('costPrice')} min={0} step={0.01} className={inputCls} /></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.products.unit}</label><input value={form.unit} onChange={update('unit')} className={inputCls} placeholder="pcs" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {!editing && <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.products.initialStock}</label><input type="number" value={form.currentStock} onChange={update('currentStock')} min={0} className={inputCls} /></div>}
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.products.lowStockAlert}</label><input type="number" value={form.lowStockThreshold} onChange={update('lowStockThreshold')} min={0} className={inputCls} /></div>
                </div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">{t.common.cancel}</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : editing ? t.common.update : t.common.create}</button></div>
            </form></div></div>}

        {delId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDelId(null)}><div className="glass-card w-full max-w-sm p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4"><Trash2 size={22} className="text-red-400" /></div>
            <h3 className="text-lg font-bold text-center">{t.pages.products.deleteTitle}</h3><p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">{t.pages.products.deleteMsg}</p>
            <div className="flex gap-3 mt-6"><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">{t.common.cancel}</button><button onClick={del} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all">{t.common.delete}</button></div>
        </div></div>}
    </div>);
}
