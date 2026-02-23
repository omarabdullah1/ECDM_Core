'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { FileText, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/i18n/useT';

interface InvItem { description: string; quantity: number; unitPrice: number; }
interface Invoice { _id: string; invoiceNumber: string; client?: { companyName: string }; items: InvItem[]; subtotal: number; tax: number; total: number; status: string; issueDate: string; dueDate?: string; }
const ST_C: Record<string, string> = { Draft: 'bg-gray-500/15 text-gray-400', Sent: 'bg-blue-500/15 text-blue-400', Paid: 'bg-emerald-500/15 text-emerald-400', Overdue: 'bg-red-500/15 text-red-400', Cancelled: 'bg-amber-500/15 text-amber-400' };
const iCls = cn('w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all');
const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function InvoicesPage() {
    const t = useT();
    const statusLabel: Record<string, string> = { Draft: t.pages.invoices.draft, Sent: t.pages.invoices.sent, Paid: t.pages.invoices.paid, Overdue: t.pages.invoices.overdue, Cancelled: t.pages.invoices.cancelled };

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
            <div><h1 className="text-2xl font-bold flex items-center gap-3"><FileText size={24} className="text-emerald-400" /> {t.pages.invoices.title}</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{t.pages.invoices.subtitle} ({total} {t.common.total})</p></div>
            <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"><Plus size={16} /> {t.pages.invoices.addBtn}</button>
        </div>
        <div className="flex gap-3 flex-wrap">
            <div className="relative w-64"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input placeholder={t.pages.invoices.searchPlaceholder} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={cn(iCls, 'ps-10')} /></div>
            <select value={fSt} onChange={e => { setFSt(e.target.value); setPage(1); }} className={cn(iCls, 'w-44')}>
                <option value="">{t.common.allStatuses}</option>
                <option value="Draft">{t.pages.invoices.draft}</option>
                <option value="Sent">{t.pages.invoices.sent}</option>
                <option value="Paid">{t.pages.invoices.paid}</option>
                <option value="Overdue">{t.pages.invoices.overdue}</option>
                <option value="Cancelled">{t.pages.invoices.cancelled}</option>
            </select>
        </div>
        <div className="glass-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[hsl(var(--border))] text-start text-[hsl(var(--muted-foreground))]"><th className="px-4 py-3 font-medium">#</th><th className="px-4 py-3 font-medium">{t.pages.invoices.client}</th><th className="px-4 py-3 font-medium">{t.common.status}</th><th className="px-4 py-3 font-medium">{t.common.date}</th><th className="px-4 py-3 font-medium text-end">{t.pages.invoices.totalAmount}</th><th className="px-4 py-3 font-medium text-end">{t.common.actions}</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={6} className="px-4 py-12 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] mx-auto" /></td></tr>
                : rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.pages.invoices.emptyState}</td></tr>
                    : rows.map(inv => <tr key={inv._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                        <td className="px-4 py-3 font-medium font-mono">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{inv.client?.companyName || '—'}</td>
                        <td className="px-4 py-3"><span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', ST_C[inv.status])}>{statusLabel[inv.status] || inv.status}</span></td>
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{new Date(inv.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3 text-end font-semibold">{money(inv.total)}</td>
                        <td className="px-4 py-3 text-end"><div className="flex items-center justify-end gap-1"><button onClick={() => openE(inv)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all"><Edit2 size={15} /></button><button onClick={() => setDelId(inv._id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all"><Trash2 size={15} /></button></div></td>
                    </tr>)}</tbody></table></div>
            {tp > 1 && <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3"><p className="text-xs text-[hsl(var(--muted-foreground))]">{t.common.page} {page} {t.common.of} {tp}</p><div className="flex gap-1"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronLeft size={16} /></button><button onClick={() => setPage(Math.min(tp, page + 1))} disabled={page >= tp} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}</div>

        {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}><div className="glass-card w-full max-w-2xl p-6 animate-fade-in bg-[hsl(var(--card))] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold">{editing ? t.common.edit : t.pages.invoices.addBtn}</h3><button onClick={() => setModal(false)} className="rounded-lg p-1 hover:bg-[hsl(var(--secondary))]"><X size={18} /></button></div>
            <form onSubmit={save} className="space-y-4">
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
                <div><label className="mb-2 block text-sm font-semibold">{t.pages.invoices.client}</label>
                    <select value={clientId} onChange={e => setClientId(e.target.value)} className={iCls}>
                        <option value="">{t.common.none}</option>
                        {clientsList.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                    </select>
                </div>
                <div><label className="mb-2 block text-sm font-semibold">{t.pages.invoices.items}</label>
                    {items.map((it, i) => <div key={i} className="flex gap-2 mb-2 items-center">
                        <input value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder={t.pages.invoices.itemDesc} className={cn(iCls, 'flex-1')} />
                        <input type="number" value={it.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} min={1} className={cn(iCls, 'w-20')} placeholder={t.pages.invoices.qty} />
                        <input type="number" value={it.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} min={0} step={0.01} className={cn(iCls, 'w-28')} placeholder={t.common.price} />
                        <span className="text-sm w-20 text-end font-medium">{money(it.quantity * it.unitPrice)}</span>
                        {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="p-1 text-red-400 hover:text-red-300"><X size={14} /></button>}
                    </div>)}
                    <button type="button" onClick={addItem} className="text-xs text-[hsl(var(--primary))] hover:underline mt-1">{t.pages.invoices.addItem}</button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.status}</label><select value={status} onChange={e => setStatus(e.target.value)} className={iCls}>
                        <option value="Draft">{t.pages.invoices.draft}</option>
                        <option value="Sent">{t.pages.invoices.sent}</option>
                        <option value="Paid">{t.pages.invoices.paid}</option>
                        <option value="Overdue">{t.pages.invoices.overdue}</option>
                        <option value="Cancelled">{t.pages.invoices.cancelled}</option>
                    </select></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.invoices.tax}</label><input type="number" value={tax} onChange={e => setTax(e.target.value)} min={0} step={0.01} className={iCls} /></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.invoices.dueDate}</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={iCls} /></div>
                </div>
                <div className="rounded-xl bg-[hsl(var(--secondary))]/30 p-4 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">{t.pages.invoices.subtotal}</span><span>{money(sub)}</span></div>
                    <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">{t.pages.invoices.tax}</span><span>{money(Number(tax))}</span></div>
                    <div className="flex justify-between font-bold text-base pt-1 border-t border-[hsl(var(--border))]"><span>{t.pages.invoices.totalAmount}</span><span>{money(sub + Number(tax))}</span></div>
                </div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">{t.common.cancel}</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : editing ? t.common.update : t.common.create}</button></div>
            </form></div></div>}

        {delId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDelId(null)}><div className="glass-card w-full max-w-sm p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4"><Trash2 size={22} className="text-red-400" /></div>
            <h3 className="text-lg font-bold text-center">{t.pages.invoices.deleteTitle}</h3><p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">{t.pages.invoices.deleteMsg}</p>
            <div className="flex gap-3 mt-6"><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">{t.common.cancel}</button><button onClick={del} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all">{t.common.delete}</button></div>
        </div></div>}
    </div>);
}
