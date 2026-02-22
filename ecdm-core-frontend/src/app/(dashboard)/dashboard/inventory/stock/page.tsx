'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { ArrowUpDown, Plus, Search, Trash2, X, ChevronLeft, ChevronRight, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from 'lucide-react';

interface Movement { _id: string; product?: { _id: string; sku: string; name: string; currentStock: number; unit: string }; type: string; quantity: number; reason?: string; reference?: string; performedBy?: { firstName: string; lastName: string }; createdAt: string; }
const TYPE_META: Record<string, { color: string; icon: typeof ArrowDownToLine }> = { In: { color: 'bg-emerald-500/15 text-emerald-400', icon: ArrowDownToLine }, Out: { color: 'bg-red-500/15 text-red-400', icon: ArrowUpFromLine }, Adjustment: { color: 'bg-blue-500/15 text-blue-400', icon: RefreshCw } };
const inputCls = cn('w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all');

export default function StockPage() {
    const [rows, setRows] = useState<Movement[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filterType, setFilterType] = useState('');
    const [filterProduct, setFilterProduct] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ product: '', type: 'In', quantity: '', reason: '', reference: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [delId, setDelId] = useState<string | null>(null);
    const [products, setProducts] = useState<{ _id: string; sku: string; name: string; currentStock: number; unit: string }[]>([]);
    const lim = 20; const tp = Math.ceil(total / lim);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const p: Record<string, string | number> = { page, limit: lim };
            if (filterType) p.type = filterType;
            if (filterProduct) p.product = filterProduct;
            const { data } = await api.get('/inventory/stock-movements', { params: p });
            setRows(data.data.data); setTotal(data.data.pagination.total);
        } catch { /* */ }
        setLoading(false);
    }, [page, filterType, filterProduct]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { api.get('/inventory/products', { params: { limit: 200 } }).then(r => setProducts(r.data.data.data)).catch(() => { }); }, []);

    const openC = () => { setForm({ product: '', type: 'In', quantity: '', reason: '', reference: '' }); setError(''); setModal(true); };

    const save = async (ev: React.FormEvent) => {
        ev.preventDefault(); setSaving(true); setError('');
        const pl = { product: form.product, type: form.type, quantity: Number(form.quantity), reason: form.reason || undefined, reference: form.reference || undefined };
        try { await api.post('/inventory/stock-movements', pl); setModal(false); fetchData(); api.get('/inventory/products', { params: { limit: 200 } }).then(r => setProducts(r.data.data.data)); }
        catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
        setSaving(false);
    };
    const del = async () => { if (!delId) return; try { await api.delete(`/inventory/stock-movements/${delId}`); fetchData(); } catch { } setDelId(null); };
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const selProduct = products.find(p => p._id === form.product);

    return (<div className="space-y-6">
        <div className="flex items-center justify-between">
            <div><h1 className="text-2xl font-bold flex items-center gap-3"><ArrowUpDown size={24} className="text-cyan-400" /> Stock Movements</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Track stock in/out operations ({total} total)</p></div>
            <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"><Plus size={16} /> Record Movement</button>
        </div>
        <div className="flex gap-3 flex-wrap">
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className={cn(inputCls, 'w-40')}><option value="">All Types</option>{['In', 'Out', 'Adjustment'].map(t => <option key={t} value={t}>{t}</option>)}</select>
            <select value={filterProduct} onChange={e => { setFilterProduct(e.target.value); setPage(1); }} className={cn(inputCls, 'w-56')}><option value="">All Products</option>{products.map(p => <option key={p._id} value={p._id}>{p.sku} — {p.name}</option>)}</select>
        </div>

        <div className="glass-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[hsl(var(--border))] text-left text-[hsl(var(--muted-foreground))]"><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium text-right">Qty</th><th className="px-4 py-3 font-medium">Reason</th><th className="px-4 py-3 font-medium">Reference</th><th className="px-4 py-3 font-medium">By</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium text-right">Actions</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={8} className="px-4 py-12 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] mx-auto" /></td></tr>
                : rows.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">No movements recorded.</td></tr>
                    : rows.map(m => {
                        const meta = TYPE_META[m.type] || TYPE_META.In; const Icon = meta.icon; return (
                            <tr key={m._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                                <td className="px-4 py-3"><span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', meta.color)}><Icon size={12} />{m.type}</span></td>
                                <td className="px-4 py-3"><span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{m.product?.sku}</span> <span className="font-medium">{m.product?.name}</span></td>
                                <td className="px-4 py-3 text-right font-semibold">{m.type === 'In' ? '+' : m.type === 'Out' ? '-' : '='}{m.quantity}</td>
                                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{m.reason || '—'}</td>
                                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] font-mono text-xs">{m.reference || '—'}</td>
                                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{m.performedBy ? `${m.performedBy.firstName} ${m.performedBy.lastName}` : '—'}</td>
                                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] text-xs">{fmtDate(m.createdAt)}</td>
                                <td className="px-4 py-3 text-right"><button onClick={() => setDelId(m._id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all"><Trash2 size={15} /></button></td>
                            </tr>);
                    })}</tbody></table></div>
            {tp > 1 && <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3"><p className="text-xs text-[hsl(var(--muted-foreground))]">Page {page} of {tp}</p><div className="flex gap-1"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronLeft size={16} /></button><button onClick={() => setPage(Math.min(tp, page + 1))} disabled={page >= tp} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}</div>

        {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}><div className="glass-card w-full max-w-lg p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold">Record Stock Movement</h3><button onClick={() => setModal(false)} className="rounded-lg p-1 hover:bg-[hsl(var(--secondary))]"><X size={18} /></button></div>
            <form onSubmit={save} className="space-y-4">
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Product *</label><select value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))} required className={inputCls}><option value="">— Select product —</option>{products.map(p => <option key={p._id} value={p._id}>{p.sku} — {p.name} (Stock: {p.currentStock} {p.unit})</option>)}</select></div>
                {selProduct && <div className="rounded-xl bg-[hsl(var(--secondary))]/30 px-4 py-3 text-sm flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Current Stock</span><span className="font-semibold">{selProduct.currentStock} {selProduct.unit}</span></div>}
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Type *</label><select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}><option value="In">Stock In (+)</option><option value="Out">Stock Out (-)</option><option value="Adjustment">Adjustment (=)</option></select></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Quantity *</label><input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} required min={0.01} step={0.01} className={inputCls} placeholder="100" /></div>
                </div>
                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Reason</label><input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} className={inputCls} placeholder="Purchase order, sale, damaged goods..." /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Reference #</label><input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} className={inputCls} placeholder="PO-12345, INV-00001" /></div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">Cancel</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Record'}</button></div>
            </form></div></div>}

        {delId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDelId(null)}><div className="glass-card w-full max-w-sm p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4"><Trash2 size={22} className="text-red-400" /></div>
            <h3 className="text-lg font-bold text-center">Delete Movement?</h3><p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">Note: This will NOT reverse the stock change.</p>
            <div className="flex gap-3 mt-6"><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">Cancel</button><button onClick={del} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all">Delete</button></div>
        </div></div>}
    </div>);
}
