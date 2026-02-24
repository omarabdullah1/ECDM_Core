'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { MessageSquare, Plus, Trash2, X, ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface Feedback { _id: string; ratingOperation: number; ratingCustomerService: number; customer?: { name: string }; engineer?: { firstName: string; lastName: string }; workOrder?: { typeOfOrder: string }; createdAt: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const blank = { workOrder: '', customer: '', engineer: '', ratingOperation: '5', ratingCustomerService: '5', notes: '' };

export default function FeedbackPage() {
  const [rows, setRows] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      const { data } = await api.get('/customer/feedback', { params: p });
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch { }
    setLoading(false);
  }, [page]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { setForm(blank); setError(''); setModal(true); };
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== '') pl[k] = (k === 'ratingOperation' || k === 'ratingCustomerService') ? Number(v) : v;
    }
    try {
      await api.post('/customer/feedback', pl);
      setModal(false); fetch_();
    } catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  const del = async () => { if (!delId) return; try { await api.delete(`/customer/feedback/${delId}`); fetch_(); } catch { } setDelId(null); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  const StarRating = ({ value }: { value: number }) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => <Star key={i} className={`h-3.5 w-3.5 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><MessageSquare className="h-7 w-7 text-[hsl(var(--primary))]" /><h1 className="text-2xl font-bold">Feedback</h1></div>
        <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"><Plus className="h-4 w-4" />Add</button>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {loading ? <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{['Customer','Engineer','Work Order','Operations Rating','CS Rating','Date','Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.customer?.name || '—'}</td>
                  <td className="px-4 py-3">{r.engineer ? `${r.engineer.firstName} ${r.engineer.lastName}` : '—'}</td>
                  <td className="px-4 py-3">{r.workOrder?.typeOfOrder || '—'}</td>
                  <td className="px-4 py-3"><StarRating value={r.ratingOperation} /></td>
                  <td className="px-4 py-3"><StarRating value={r.ratingCustomerService} /></td>
                  <td className="px-4 py-3">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><button onClick={() => setDelId(r._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No feedback found.</td></tr>}
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
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">Log Feedback</h2><button onClick={() => setModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={save} className="space-y-4">
              <input required placeholder="Work Order ID" value={form.workOrder} onChange={u('workOrder')} className={iCls} />
              <input required placeholder="Customer ID" value={form.customer} onChange={u('customer')} className={iCls} />
              <input placeholder="Engineer (User ID)" value={form.engineer} onChange={u('engineer')} className={iCls} />
              <div className="flex gap-4">
                <div className="flex-1"><label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Operations Rating (1–5)</label><input type="number" min="1" max="5" value={form.ratingOperation} onChange={u('ratingOperation')} className={iCls} /></div>
                <div className="flex-1"><label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Customer Service Rating (1–5)</label><input type="number" min="1" max="5" value={form.ratingCustomerService} onChange={u('ratingCustomerService')} className={iCls} /></div>
              </div>
              <textarea placeholder="Notes" value={form.notes} onChange={u('notes')} rows={3} className={iCls} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <p className="mb-4 font-semibold">Delete this feedback?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
