'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { FileText, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface InvItem { description: string; quantity: number; unitPrice: number; }
interface Invoice { _id: string; invoiceNumber: string; client?: { companyName: string }; items: InvItem[]; subtotal: number; tax: number; total: number; status: string; issueDate: string; dueDate?: string; }
const ST_C: Record<string, string> = { Draft: 'bg-gray-500/15 text-gray-400', Sent: 'bg-blue-500/15 text-blue-400', Paid: 'bg-emerald-500/15 text-emerald-400', Overdue: 'bg-red-500/15 text-red-400', Cancelled: 'bg-amber-500/15 text-amber-400' };
const iCls = cn('w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all');
const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function InvoicesPage() {
    const [rows, setRows] = useState<Invoice[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [fSt, setFSt] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Invoice | null>(null);
    const [items, setItems] = useState<InvItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
    const [tax, setTax] = useState('0');
    const [status, setStatus] = useState('Draft');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [delId, setDelId] = useState<string | null>(null);
    const [clientId, setClientId] = useState('');
    const [clientsList, setClientsList] = useState<{ _id: string; companyName: string }[]>([]);
    const lim = 10; const tp = Math.ceil(total / lim);

    const fetch_ = useCallback(async () => {
        setLoading(true);
        try {
            const p: Record<string, string | number> = { page, limit: lim };
            if (search) p.search = search; if (fSt) p.status = fSt;
            const { data } = await api.get('/erp/invoices', { params: p });
            setRows(data.data.data); setTotal(data.data.pagination.total);
        } catch { /* */ }
        setLoading(false);
    }, [page, search, fSt]);
    useEffect(() => { fetch_(); }, [fetch_]);

    useEffect(() => {
        api.get('/crm/clients', { params: { limit: 100 } }).then(r => setClientsList(r.data.data.data)).catch(() => { });
    }, []);

    const openC = () => { setEditing(null); setItems([{ description: '', quantity: 1, unitPrice: 0 }]); setTax('0'); setStatus('Draft'); setDueDate(''); setNotes(''); setClientId(''); setModal(true); };
    const openE = (inv: Invoice) => { setEditing(inv); setItems(inv.items.map(i => ({ ...i }))); setTax(inv.tax.toString()); setStatus(inv.status); setDueDate(inv.dueDate ? inv.dueDate.split('T')[0] : ''); setNotes(''); setClientId((inv.client as unknown as { _id: string })?._id || ''); setModal(true); };

    const addItem = () => setItems(p => [...p, { description: '', quantity: 1, unitPrice: 0 }]);
    const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
    const updateItem = (i: number, f: keyof InvItem, v: string | number) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [f]: v } : it));

    const save = async (ev: React.FormEvent) => {
        ev.preventDefault(); setSaving(true); setError('');
        const validItems = items.filter(i => i.description.trim());
        if (!validItems.length) { setError('At least one item required'); setSaving(false); return; }
        const pl: Record<string, unknown> = { items: validItems.map(i => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })), tax: Number(tax), status };
        if (clientId) pl.client = clientId;
        if (dueDate) pl.dueDate = dueDate;
        if (notes) pl.notes = notes;
        try { if (editing) await api.put(`/erp/invoices/${editing._id}`, pl); else await api.post('/erp/invoices', pl); setModal(false); fetch_(); }
        catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
        setSaving(false);
    };
    const del = async () => { if (!delId) return; try { await api.delete(`/erp/invoices/${delId}`); fetch_(); } catch { } setDelId(null); };
    const sub = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);

    return (<div className="space-y-6">
        <div className="flex items-center justify-between">
            <div><h1 className="text-2xl font-bold flex items-center gap-3"><FileText size={24} className="text-emerald-400" /> Invoices</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Manage billing ({total} total)</p></div>
            <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"><Plus size={16} /> New Invoice</button>
        </div>
        <div className="flex gap-3 flex-wrap">
            <div className="relative w-64"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input placeholder="Search by #..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={cn(iCls, 'pl-10')} /></div>
            <select value={fSt} onChange={e => { setFSt(e.target.value); setPage(1); }} className={cn(iCls, 'w-44')}><option value="">All Statuses</option>{['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}</select>
        </div>
        <div className="glass-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[hsl(var(--border))] text-left text-[hsl(var(--muted-foreground))]"><th className="px-4 py-3 font-medium">Invoice #</th><th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Issue Date</th><th className="px-4 py-3 font-medium text-right">Total</th><th className="px-4 py-3 font-medium text-right">Actions</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={6} className="px-4 py-12 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] mx-auto" /></td></tr>
                : rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">No invoices found.</td></tr>
                    : rows.map(inv => <tr key={inv._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                        <td className="px-4 py-3 font-medium font-mono">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{inv.client?.companyName || '—'}</td>
                        <td className="px-4 py-3"><span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', ST_C[inv.status])}>{inv.status}</span></td>
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{new Date(inv.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3 text-right font-semibold">{money(inv.total)}</td>
                        <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => openE(inv)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all"><Edit2 size={15} /></button><button onClick={() => setDelId(inv._id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all"><Trash2 size={15} /></button></div></td>
                    </tr>)}</tbody></table></div>
            {tp > 1 && <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3"><p className="text-xs text-[hsl(var(--muted-foreground))]">Page {page} of {tp}</p><div className="flex gap-1"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronLeft size={16} /></button><button onClick={() => setPage(Math.min(tp, page + 1))} disabled={page >= tp} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}</div>

        {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}><div className="glass-card w-full max-w-2xl p-6 animate-fade-in bg-[hsl(var(--card))] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold">{editing ? 'Edit Invoice' : 'New Invoice'}</h3><button onClick={() => setModal(false)} className="rounded-lg p-1 hover:bg-[hsl(var(--secondary))]"><X size={18} /></button></div>
            <form onSubmit={save} className="space-y-4">
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
                <div><label className="mb-2 block text-sm font-semibold">Client</label>
                    <select value={clientId} onChange={e => setClientId(e.target.value)} className={iCls}>
                        <option value="">— None —</option>
                        {clientsList.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                    </select>
                </div>
                <div><label className="mb-2 block text-sm font-semibold">Line Items</label>
                    {items.map((it, i) => <div key={i} className="flex gap-2 mb-2 items-center">
                        <input value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Description" className={cn(iCls, 'flex-1')} />
                        <input type="number" value={it.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} min={1} className={cn(iCls, 'w-20')} placeholder="Qty" />
                        <input type="number" value={it.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} min={0} step={0.01} className={cn(iCls, 'w-28')} placeholder="Price" />
                        <span className="text-sm w-20 text-right font-medium">{money(it.quantity * it.unitPrice)}</span>
                        {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="p-1 text-red-400 hover:text-red-300"><X size={14} /></button>}
                    </div>)}
                    <button type="button" onClick={addItem} className="text-xs text-[hsl(var(--primary))] hover:underline mt-1">+ Add item</button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Status</label><select value={status} onChange={e => setStatus(e.target.value)} className={iCls}>{['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Tax ($)</label><input type="number" value={tax} onChange={e => setTax(e.target.value)} min={0} step={0.01} className={iCls} /></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={iCls} /></div>
                </div>
                <div className="rounded-xl bg-[hsl(var(--secondary))]/30 p-4 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Subtotal</span><span>{money(sub)}</span></div>
                    <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Tax</span><span>{money(Number(tax))}</span></div>
                    <div className="flex justify-between font-bold text-base pt-1 border-t border-[hsl(var(--border))]"><span>Total</span><span>{money(sub + Number(tax))}</span></div>
                </div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">Cancel</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : editing ? 'Update' : 'Create'}</button></div>
            </form></div></div>}

        {delId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDelId(null)}><div className="glass-card w-full max-w-sm p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4"><Trash2 size={22} className="text-red-400" /></div>
            <h3 className="text-lg font-bold text-center">Delete Invoice?</h3><p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">This cannot be undone.</p>
            <div className="flex gap-3 mt-6"><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">Cancel</button><button onClick={del} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all">Delete</button></div>
        </div></div>}
    </div>);
}
