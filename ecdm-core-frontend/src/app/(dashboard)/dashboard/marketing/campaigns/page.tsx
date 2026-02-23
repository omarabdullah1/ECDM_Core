'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Megaphone, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, TrendingUp, DollarSign, Eye } from 'lucide-react';
import { useT } from '@/i18n/useT';

interface Campaign { _id: string; name: string; platform: string; status: string; impressions?: number; conversions?: number; salesRevenue?: number; budget?: number; startDate?: string; endDate?: string; notes?: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const PLATFORMS = ['Google','Facebook','Instagram','LinkedIn','TikTok','Twitter','Email','SMS','Other'];
const STATUSES  = ['Previous','Current','Future'];
const blank = { name:'',platform:'',status:'',impressions:'',conversions:'',salesRevenue:'',budget:'',startDate:'',endDate:'',notes:'' };
const sColor: Record<string,string> = { Current:'bg-green-500/20 text-green-400', Future:'bg-blue-500/20 text-blue-400', Previous:'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]' };

export default function CampaignsPage() {
  const t = useT();
  const [rows, setRows]       = useState<Campaign[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [fStatus, setFStatus] = useState('');
  const [fPlatform, setFPlatform] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm]       = useState(blank);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [delId, setDelId]     = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string,string|number> = { page, limit: lim };
      if (fStatus)   p.status   = fStatus;
      if (fPlatform) p.platform = fPlatform;
      const { data } = await api.get('/erp/campaigns', { params: p });
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch { }
    setLoading(false);
  }, [page, fStatus, fPlatform]);
  useEffect(() => { load(); }, [load]);

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: Campaign) => {
    setEditing(r);
    setForm({ name:r.name, platform:r.platform, status:r.status,
      impressions:String(r.impressions??''), conversions:String(r.conversions??''),
      salesRevenue:String(r.salesRevenue??''), budget:String(r.budget??''),
      startDate:r.startDate?r.startDate.slice(0,10):'', endDate:r.endDate?r.endDate.slice(0,10):'', notes:r.notes??'' });
    setError(''); setModal(true);
  };
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string,unknown> = { name:form.name, platform:form.platform, status:form.status };
    if (form.impressions)  pl.impressions  = Number(form.impressions);
    if (form.conversions)  pl.conversions  = Number(form.conversions);
    if (form.salesRevenue) pl.salesRevenue = Number(form.salesRevenue);
    if (form.budget)       pl.budget       = Number(form.budget);
    if (form.startDate)    pl.startDate    = form.startDate;
    if (form.endDate)      pl.endDate      = form.endDate;
    if (form.notes)        pl.notes        = form.notes;
    try {
      if (editing) await api.put(`/erp/campaigns/${editing._id}`, pl);
      else         await api.post('/erp/campaigns', pl);
      setModal(false); load();
    } catch (e: unknown) { setError((e as {response?:{data?:{message?:string}}}).response?.data?.message||'Failed'); }
    setSaving(false);
  };
  const del = async () => { if (!delId) return; try { await api.delete(`/erp/campaigns/${delId}`); load(); } catch { } setDelId(null); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setForm(p => ({...p,[f]:e.target.value}));
  const convRate = (r: Campaign) => r.impressions&&r.conversions&&r.impressions>0?((r.conversions/r.impressions)*100).toFixed(1)+'%':'—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/20 flex items-center justify-center"><Megaphone size={20} className="text-[hsl(var(--primary))]"/></div>
          <div><h1 className="text-2xl font-bold">{t.pages.campaigns.title}</h1><p className="text-sm text-[hsl(var(--muted-foreground))]">{total} {t.common.total}</p></div>
        </div>
        <button onClick={openC} className="flex items-center gap-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16}/> {t.pages.campaigns.addBtn}
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={fStatus} onChange={e=>{setFStatus(e.target.value);setPage(1);}} className={iCls+' !w-44'}>
          <option value="">{t.common.allStatuses}</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select value={fPlatform} onChange={e=>{setFPlatform(e.target.value);setPage(1);}} className={iCls+' !w-44'}>
          <option value="">{t.common.allPlatforms}</option>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{[t.common.name, t.common.platform, t.common.status, t.common.budget, t.common.dates, t.common.impressions, t.pages.campaigns.convRate, t.common.revenue, t.common.notes, t.common.actions].map(h=>
                <th key={h} className="px-4 py-3 text-start font-medium text-[hsl(var(--muted-foreground))]">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading?(<tr><td colSpan={10} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.common.loading}</td></tr>)
              :rows.length===0?(<tr><td colSpan={10} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.pages.campaigns.emptyState}</td></tr>)
              :rows.map(r=>(
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.platform}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${sColor[r.status]??'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1"><DollarSign size={13}/>{r.budget?.toLocaleString()??'—'}</span></td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] text-xs whitespace-nowrap">
                    {r.startDate?new Date(r.startDate).toLocaleDateString():'?'} → {r.endDate?new Date(r.endDate).toLocaleDateString():'?'}
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1"><Eye size={13}/>{r.impressions?.toLocaleString()??'—'}</span></td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{convRate(r)}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1"><TrendingUp size={13}/>{r.salesRevenue?.toLocaleString()??'—'}</span></td>
                  <td className="px-4 py-3 max-w-[160px] truncate text-[hsl(var(--muted-foreground))]">{r.notes??'—'}</td>
                  <td className="px-4 py-3"><div className="flex gap-2">
                    <button onClick={()=>openE(r)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><Edit2 size={14}/></button>
                    <button onClick={()=>setDelId(r._id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-[hsl(var(--muted-foreground))] hover:text-red-400"><Trash2 size={14}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tp>1&&(<div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))]">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">{t.common.page} {page} {t.common.of} {tp}</span>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"><ChevronLeft size={16}/></button>
            <button disabled={page===tp} onClick={()=>setPage(p=>p+1)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"><ChevronRight size={16}/></button>
          </div>
        </div>)}
      </div>

      {modal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]"><h2 className="text-lg font-semibold">{editing ? t.common.edit : t.pages.campaigns.addBtn}</h2><button onClick={()=>setModal(false)} className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg"><X size={18}/></button></div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error&&<div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}
              <div><label className="block text-sm font-medium mb-1.5">{t.common.name} *</label><input className={iCls} value={form.name} onChange={u('name')} required placeholder={t.pages.campaigns.namePlaceholder}/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1.5">{t.common.platform} *</label>
                  <select className={iCls} value={form.platform} onChange={u('platform')} required><option value="">{t.common.select}</option>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1.5">{t.common.status} *</label>
                  <select className={iCls} value={form.status} onChange={u('status')} required><option value="">{t.common.select}</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1.5">{t.common.impressions}</label><input className={iCls} type="number" min="0" value={form.impressions} onChange={u('impressions')}/></div>
                <div><label className="block text-sm font-medium mb-1.5">{t.common.conversions}</label><input className={iCls} type="number" min="0" value={form.conversions} onChange={u('conversions')}/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1.5">{t.common.revenue} ($)</label><input className={iCls} type="number" min="0" step="0.01" value={form.salesRevenue} onChange={u('salesRevenue')}/></div>
                <div><label className="block text-sm font-medium mb-1.5">{t.common.budget} ($)</label><input className={iCls} type="number" min="0" step="0.01" value={form.budget} onChange={u('budget')}/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1.5">{t.common.startDate}</label><input className={iCls} type="date" value={form.startDate} onChange={u('startDate')}/></div>
                <div><label className="block text-sm font-medium mb-1.5">{t.common.endDate}</label><input className={iCls} type="date" value={form.endDate} onChange={u('endDate')}/></div>
              </div>
              <div><label className="block text-sm font-medium mb-1.5">{t.common.notes}</label><textarea className={iCls} rows={3} value={form.notes} onChange={u('notes')}/></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))]">{t.common.cancel}</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? t.common.saving : editing ? t.common.update : t.common.create}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {delId&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] w-full max-w-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t.pages.campaigns.deleteTitle}</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{t.common.cannotUndo}</p>
          <div className="flex gap-3">
            <button onClick={()=>setDelId(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))]">{t.common.cancel}</button>
            <button onClick={del} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">{t.common.delete}</button>
          </div>
        </div>
      </div>)}
    </div>
  );
}
