'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Wrench, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkOrder { _id: string; typeOfOrder: string; issue: string; punctuality?: string; customer?: { name: string; phone: string }; assignedEngineer?: { firstName: string; lastName: string }; createdAt: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const ORDER_TYPES = ['Maintenance', 'Installation', 'Spare Parts', 'Inspection', 'Other'];
const PUNCTUALITIES = ['On-Time', 'Late'];
const blank = { customer: '', assignedEngineer: '', salesOrder: '', typeOfOrder: '', issue: '', visitSiteDate: '', punctuality: '', notes: '' };

export default function WorkOrderPage() {
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fType, setFType] = useState('');
  const [fPunctuality, setFPunct] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fType) p.typeOfOrder = fType;
      if (fPunctuality) p.punctuality = fPunctuality;
      const { data } = await api.get('/operations/work-order', { params: p });
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch { }
    setLoading(false);
  }, [page, fType, fPunctuality]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: WorkOrder) => { setEditing(r); setForm({ ...blank, typeOfOrder: r.typeOfOrder, issue: r.issue, punctuality: r.punctuality || '' }); setError(''); setModal(true); };
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) { if (v !== '') pl[k] = v; }
    try {
      if (editing) await api.put(`/operations/work-order/${editing._id}`, pl);
      else await api.post('/operations/work-order', pl);
      setModal(false); fetch_();
    } catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  const del = async () => { if (!delId) return; try { await api.delete(`/operations/work-order/${delId}`); fetch_(); } catch { } setDelId(null); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Wrench className="h-7 w-7 text-[hsl(var(--primary))]" /><h1 className="text-2xl font-bold">Work Orders</h1></div>
        <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"><Plus className="h-4 w-4" />Add</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={fType} onChange={e => { setFType(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
          <option value="">All Types</option>
          {ORDER_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fPunctuality} onChange={e => { setFPunct(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
          <option value="">All Punctuality</option>
          {PUNCTUALITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {loading ? <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{['Customer','Engineer','Type','Issue','Punctuality','Date','Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.customer?.name || '—'}</td>
                  <td className="px-4 py-3">{r.assignedEngineer ? `${r.assignedEngineer.firstName} ${r.assignedEngineer.lastName}` : '—'}</td>
                  <td className="px-4 py-3">{r.typeOfOrder}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{r.issue}</td>
                  <td className="px-4 py-3">{r.punctuality ? <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.punctuality === 'On-Time' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.punctuality}</span> : '—'}</td>
                  <td className="px-4 py-3">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openE(r)} className="p-1 hover:text-[hsl(var(--primary))]"><Edit2 className="h-4 w-4" /></button><button onClick={() => setDelId(r._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No work orders found.</td></tr>}
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
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">{editing ? 'Edit Work Order' : 'New Work Order'}</h2><button onClick={() => setModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={save} className="space-y-4">
              {!editing && <input required placeholder="Customer ID" value={form.customer} onChange={u('customer')} className={iCls} />}
              {!editing && <input required placeholder="Engineer (User ID)" value={form.assignedEngineer} onChange={u('assignedEngineer')} className={iCls} />}
              <select required value={form.typeOfOrder} onChange={u('typeOfOrder')} className={iCls}><option value="">Select Order Type</option>{ORDER_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <textarea required placeholder="Issue Description" value={form.issue} onChange={u('issue')} rows={3} className={iCls} />
              <input type="date" placeholder="Visit Site Date" value={form.visitSiteDate} onChange={u('visitSiteDate')} className={iCls} />
              {editing && <select value={form.punctuality} onChange={u('punctuality')} className={iCls}><option value="">Set Punctuality</option>{PUNCTUALITIES.map(s => <option key={s} value={s}>{s}</option>)}</select>}
              <textarea placeholder="Notes" value={form.notes} onChange={u('notes')} rows={2} className={iCls} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <p className="mb-4 font-semibold">Delete this work order?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
