'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { ClipboardList, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface FollowUp { _id: string; solvedIssue: boolean; followUpDate: string; customer?: { name: string }; csr?: { firstName: string; lastName: string }; workOrder?: { typeOfOrder: string }; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const blank = { workOrder: '', customer: '', csr: '', followUpDate: '', solvedIssue: 'false', notes: '' };

export default function FollowUpPage() {
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fSolved, setFSolved] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fSolved !== '') p.solvedIssue = fSolved;
      const { data } = await api.get('/customer/follow-up', { params: p });
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch { }
    setLoading(false);
  }, [page, fSolved]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: FollowUp) => { setEditing(r); setForm({ workOrder: '', customer: '', csr: '', followUpDate: r.followUpDate?.slice(0, 10) || '', solvedIssue: String(r.solvedIssue), notes: '' }); setError(''); setModal(true); };
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== '') pl[k] = k === 'solvedIssue' ? v === 'true' : v;
    }
    try {
      if (editing) await api.put(`/customer/follow-up/${editing._id}`, pl);
      else await api.post('/customer/follow-up', pl);
      setModal(false); fetch_();
    } catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  const del = async () => { if (!delId) return; try { await api.delete(`/customer/follow-up/${delId}`); fetch_(); } catch { } setDelId(null); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><ClipboardList className="h-7 w-7 text-[hsl(var(--primary))]" /><h1 className="text-2xl font-bold">'Follow Ups'</h1></div>
        <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"><Plus className="h-4 w-4" />'Add'</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={fSolved} onChange={e => { setFSolved(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="false">Pending</option>
          <option value="true">Solved</option>
        </select>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {loading ? <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{['Customer','CSR','Work Order','Follow Up Date','Solved','Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.customer?.name || '—'}</td>
                  <td className="px-4 py-3">{r.csr ? `${r.csr.firstName} ${r.csr.lastName}` : '—'}</td>
                  <td className="px-4 py-3">{r.workOrder?.typeOfOrder || '—'}</td>
                  <td className="px-4 py-3">{r.followUpDate ? new Date(r.followUpDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.solvedIssue ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.solvedIssue ? 'Solved' : 'Pending'}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openE(r)} className="p-1 hover:text-[hsl(var(--primary))]"><Edit2 className="h-4 w-4" /></button><button onClick={() => setDelId(r._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No follow-ups found.</td></tr>}
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
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">{editing ? 'Edit Follow Up' : 'New Follow Up'}</h2><button onClick={() => setModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={save} className="space-y-4">
              {!editing && <input required placeholder="Work Order ID" value={form.workOrder} onChange={u('workOrder')} className={iCls} />}
              {!editing && <input required placeholder="Customer ID" value={form.customer} onChange={u('customer')} className={iCls} />}
              {!editing && <input placeholder="CSR (User ID)" value={form.csr} onChange={u('csr')} className={iCls} />}
              <input type="date" value={form.followUpDate} onChange={u('followUpDate')} className={iCls} />
              <select value={form.solvedIssue} onChange={u('solvedIssue')} className={iCls}><option value="false">Pending</option><option value="true">Solved</option></select>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <p className="mb-4 font-semibold">Delete this follow-up?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
