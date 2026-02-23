'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { ClipboardList, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface SalesOrder { _id: string; quotationStatus: string; finalStatus?: string; totalAmount?: number; createdAt: string; salesLead?: { fullName: string }; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const Q_STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected', 'Revised'];
const F_STATUSES = ['Pending', 'Won', 'Lost', 'Cancelled'];
const blank = { salesLead: '', quotationStatus: 'Draft', finalStatus: '', totalAmount: '', notes: '' };

export default function SalesOrderPage() {
  const [rows, setRows] = useState<SalesOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fStatus, setFStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SalesOrder | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fStatus) p.quotationStatus = fStatus;
      const { data } = await api.get('/sales/orders', { params: p });
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch { }
    setLoading(false);
  }, [page, fStatus]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: SalesOrder) => { setEditing(r); setForm({ salesLead: '', quotationStatus: r.quotationStatus, finalStatus: r.finalStatus || '', totalAmount: String(r.totalAmount || ''), notes: '' }); setError(''); setModal(true); };
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) { if (v !== '') pl[k] = k === 'totalAmount' ? Number(v) : v; }
    try {
      if (editing) await api.put(`/sales/orders/${editing._id}`, pl);
      else await api.post('/sales/orders', pl);
      setModal(false); fetch_();
    } catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  const del = async () => { if (!delId) return; try { await api.delete(`/sales/orders/${delId}`); fetch_(); } catch { } setDelId(null); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><ClipboardList className="h-7 w-7 text-[hsl(var(--primary))]" /><h1 className="text-2xl font-bold">'Sales Orders'</h1></div>
        <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"><Plus className="h-4 w-4" />'Add'</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {Q_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {loading ? <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{['Lead','Quotation Status','Final Status','Amount','Date','Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.salesLead?.fullName || '—'}</td>
                  <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">{r.quotationStatus}</span></td>
                  <td className="px-4 py-3">{r.finalStatus || '—'}</td>
                  <td className="px-4 py-3">{r.totalAmount ? `EGP ${r.totalAmount.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openE(r)} className="p-1 hover:text-[hsl(var(--primary))]"><Edit2 className="h-4 w-4" /></button><button onClick={() => setDelId(r._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No orders found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {tp > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm">{page} / {tp}</span>
          <button onClick={() => setPage(p => Math.min(tp, p + 1))} disabled={page === tp} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">{editing ? 'Edit Order' : 'New Order'}</h2><button onClick={() => setModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={save} className="space-y-4">
              {!editing && <input placeholder="Sales Lead ID" value={form.salesLead} onChange={u('salesLead')} className={iCls} />}
              <select required value={form.quotationStatus} onChange={u('quotationStatus')} className={iCls}>{Q_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select value={form.finalStatus} onChange={u('finalStatus')} className={iCls}><option value="">Final Status (optional)</option>{F_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <input type="number" placeholder="Total Amount (EGP)" value={form.totalAmount} onChange={u('totalAmount')} className={iCls} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <p className="mb-4 font-semibold">Delete this order?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
