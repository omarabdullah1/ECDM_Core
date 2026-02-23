'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { TrendingUp, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MarketingLead { _id: string; fullName: string; phone: string; email?: string; source: string; status: string; notes?: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const SOURCES = ['Facebook', 'Instagram', 'TikTok', 'Snapchat', 'GoogleAds', 'Website', 'Referral', 'WhatsApp', 'Cold Call', 'Exhibition', 'Other'];
const STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Disqualified'];
const blank = { fullName: '', phone: '', email: '', source: '', status: 'New', notes: '' };

export default function MarketingLeadsPage() {
  const [rows, setRows] = useState<MarketingLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fStatus, setFStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<MarketingLead | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fStatus) p.status = fStatus;
      const { data } = await api.get('/marketing/leads', { params: p });
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch { }
    setLoading(false);
  }, [page, fStatus]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: MarketingLead) => { setEditing(r); setForm({ fullName: r.fullName, phone: r.phone, email: r.email || '', source: r.source, status: r.status, notes: r.notes || '' }); setError(''); setModal(true); };
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) { if (v !== '') pl[k] = v; }
    try {
      if (editing) await api.put(`/marketing/leads/${editing._id}`, pl);
      else await api.post('/marketing/leads', pl);
      setModal(false); fetch_();
    } catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  const del = async () => { if (!delId) return; try { await api.delete(`/marketing/leads/${delId}`); fetch_(); } catch { } setDelId(null); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><TrendingUp className="h-7 w-7 text-[hsl(var(--primary))]" /><h1 className="text-2xl font-bold">'Marketing Leads'</h1></div>
        <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"><Plus className="h-4 w-4" />'Add'</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
          <option value="">'All Statuses'</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {loading ? <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{['Name','Phone','Email','Source','Status','Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.fullName}</td>
                  <td className="px-4 py-3">{r.phone}</td>
                  <td className="px-4 py-3">{r.email || '—'}</td>
                  <td className="px-4 py-3">{r.source}</td>
                  <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">{r.status}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openE(r)} className="p-1 hover:text-[hsl(var(--primary))]"><Edit2 className="h-4 w-4" /></button><button onClick={() => setDelId(r._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No leads found.</td></tr>}
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
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">{editing ? 'Edit Lead' : 'Add Lead'}</h2><button onClick={() => setModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={save} className="space-y-4">
              <input required placeholder="Full Name" value={form.fullName} onChange={u('fullName')} className={iCls} />
              <input required placeholder="Phone" value={form.phone} onChange={u('phone')} className={iCls} />
              <input placeholder="Email" value={form.email} onChange={u('email')} className={iCls} />
              <select required value={form.source} onChange={u('source')} className={iCls}><option value="">Select Source</option>{SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select value={form.status} onChange={u('status')} className={iCls}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
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
            <p className="mb-4 font-semibold">Delete this lead?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
