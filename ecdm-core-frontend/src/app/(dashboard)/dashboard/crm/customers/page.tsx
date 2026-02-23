'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Users, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Customer { _id: string; name: string; phone: string; address?: string; region?: string; sector: string; customerAgeStatus: string; status: string; notes?: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const SECTORS = ['B2B', 'B2C', 'B2G'];
const AGE_STATUSES = ['NEW', 'OLD'];
const STATUSES = ['Active', 'Inactive', 'Potential', 'VIP', 'Closed'];
const blank = { name: '', phone: '', address: '', region: '', sector: '', customerAgeStatus: '', status: '', notes: '' };

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fSector, setFSector] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fSector) p.sector = fSector;
      if (fStatus) p.status = fStatus;
      const { data } = await api.get('/crm/customers', { params: p });
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch { }
    setLoading(false);
  }, [page, fSector, fStatus]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: Customer) => { setEditing(r); setForm({ name: r.name, phone: r.phone, address: r.address || '', region: r.region || '', sector: r.sector, customerAgeStatus: r.customerAgeStatus, status: r.status, notes: r.notes || '' }); setError(''); setModal(true); };
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) { if (v !== '') pl[k] = v; }
    try {
      if (editing) await api.put(`/crm/customers/${editing._id}`, pl);
      else await api.post('/crm/customers', pl);
      setModal(false); fetch_();
    } catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  const del = async () => { if (!delId) return; try { await api.delete(`/crm/customers/${delId}`); fetch_(); } catch { } setDelId(null); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Users className="w-7 h-7 text-blue-400" /><h1 className="text-2xl font-bold">Customers</h1></div>
        <button onClick={openC} className="flex items-center gap-2 bg-[hsl(var(--primary))] text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" />Add Customer</button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <select value={fSector} onChange={e => { setFSector(e.target.value); setPage(1); }} className={iCls + ' !w-40'}>
          <option value="">All Sectors</option>{SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }} className={iCls + ' !w-44'}>
          <option value="">All Statuses</option>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
            {['Name','Phone','Sector','Status','Age Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12"><div className="inline-block w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-[hsl(var(--muted-foreground))]">No customers found.</td></tr>
            ) : rows.map(r => (
              <tr key={r._id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] transition-colors">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.phone}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium">{r.sector}</span></td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] text-xs font-medium">{r.status}</span></td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.customerAgeStatus}</td>
                <td className="px-4 py-3"><div className="flex gap-2">
                  <button onClick={() => openE(r)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDelId(r._id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tp > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Page {page} of {tp} — {total} total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-xl border border-[hsl(var(--border))] disabled:opacity-40 hover:bg-[hsl(var(--secondary))] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page === tp} onClick={() => setPage(p => p + 1)} className="p-2 rounded-xl border border-[hsl(var(--border))] disabled:opacity-40 hover:bg-[hsl(var(--secondary))] transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Customer' : 'New Customer'}</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--secondary))] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs text-[hsl(var(--muted-foreground))]">Name *</label><input required className={iCls} value={form.name} onChange={u('name')} placeholder="Full name" /></div>
                <div className="space-y-1"><label className="text-xs text-[hsl(var(--muted-foreground))]">Phone *</label><input required className={iCls} value={form.phone} onChange={u('phone')} placeholder="Phone number" /></div>
              </div>
              <div className="space-y-1"><label className="text-xs text-[hsl(var(--muted-foreground))]">Address</label><input className={iCls} value={form.address} onChange={u('address')} placeholder="Address" /></div>
              <div className="space-y-1"><label className="text-xs text-[hsl(var(--muted-foreground))]">Region</label><input className={iCls} value={form.region} onChange={u('region')} placeholder="Region" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-xs text-[hsl(var(--muted-foreground))]">Sector</label>
                  <select className={iCls} value={form.sector} onChange={u('sector')}><option value="">Select</option>{SECTORS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="space-y-1"><label className="text-xs text-[hsl(var(--muted-foreground))]">Age Status</label>
                  <select className={iCls} value={form.customerAgeStatus} onChange={u('customerAgeStatus')}><option value="">Select</option>{AGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="space-y-1"><label className="text-xs text-[hsl(var(--muted-foreground))]">Status</label>
                  <select className={iCls} value={form.status} onChange={u('status')}><option value="">Select</option>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div className="space-y-1"><label className="text-xs text-[hsl(var(--muted-foreground))]">Notes</label><textarea className={iCls} rows={3} value={form.notes} onChange={u('notes')} placeholder="Optional notes" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-3 rounded-xl border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--secondary))] transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Delete Customer</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Are you sure? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)} className="flex-1 py-3 rounded-xl border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--secondary))] transition-colors">Cancel</button>
              <button onClick={del} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


