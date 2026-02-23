'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { FileVideo, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ContentItem { _id: string; name: string; type: string; status: string; sector?: string; postDate?: string; notes?: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const TYPES    = ['Google','Facebook','Instagram','LinkedIn','TikTok','YouTube','Email','Other'];
const STATUSES = ['New','In progress','Published','Paused'];
const SECTORS  = ['B2B','B2C','B2G'];
const blank = { name:'',type:'',status:'',sector:'',postDate:'',notes:'' };
const sColor: Record<string,string> = { Published:'bg-green-500/20 text-green-400', 'In progress':'bg-yellow-500/20 text-yellow-400', New:'bg-blue-500/20 text-blue-400', Paused:'bg-gray-500/20 text-gray-400' };

export default function ContentTrackerPage() {
  const [rows,setRows] = useState<ContentItem[]>([]);
  const [total,setTotal] = useState(0); const [page,setPage] = useState(1);
  const [fStatus,setFStatus] = useState(''); const [fType,setFType] = useState('');
  const [loading,setLoading] = useState(true); const [modal,setModal] = useState(false);
  const [editing,setEditing] = useState<ContentItem|null>(null);
  const [form,setForm] = useState(blank); const [saving,setSaving] = useState(false);
  const [error,setError] = useState(''); const [delId,setDelId] = useState<string|null>(null);
  const lim=10; const tp=Math.ceil(total/lim);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string,string|number> = {page,limit:lim};
      if (fStatus) p.status=fStatus; if (fType) p.type=fType;
      const {data} = await api.get('/erp/content-tracker',{params:p});
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch {} setLoading(false);
  },[page,fStatus,fType]);
  useEffect(()=>{load();},[load]);

  const openC = () => {setEditing(null);setForm(blank);setError('');setModal(true);};
  const openE = (r: ContentItem) => {setEditing(r);setForm({name:r.name,type:r.type,status:r.status,sector:r.sector??'',postDate:r.postDate?r.postDate.slice(0,10):'',notes:r.notes??''});setError('');setModal(true);};
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string,unknown> = {name:form.name,type:form.type,status:form.status};
    if (form.sector) pl.sector=form.sector; if (form.postDate) pl.postDate=form.postDate; if (form.notes) pl.notes=form.notes;
    try {
      if (editing) await api.put(`/erp/content-tracker/${editing._id}`,pl);
      else await api.post('/erp/content-tracker',pl);
      setModal(false); load();
    } catch (e:unknown){setError((e as {response?:{data?:{message?:string}}}).response?.data?.message||'Failed');}
    setSaving(false);
  };
  const del = async () => {if(!delId)return;try{await api.delete(`/erp/content-tracker/${delId}`);load();}catch{}setDelId(null);};
  const u = (f:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/20 flex items-center justify-center"><FileVideo size={20} className="text-[hsl(var(--primary))]"/></div>
          <div><h1 className="text-2xl font-bold">Content Tracker</h1><p className="text-sm text-[hsl(var(--muted-foreground))]">{total} items</p></div>
        </div>
        <button onClick={openC} className="flex items-center gap-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"><Plus size={16}/>New Content</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={fStatus} onChange={e=>{setFStatus(e.target.value);setPage(1);}} className={iCls+' !w-44'}><option value="">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select value={fType} onChange={e=>{setFType(e.target.value);setPage(1);}} className={iCls+' !w-44'}><option value="">All Types</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{['Name','Type','Status','Sector','Post Date','Notes','Actions'].map(h=><th key={h} className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading?(<tr><td colSpan={7} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Loading…</td></tr>)
              :rows.length===0?(<tr><td colSpan={7} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">No content found</td></tr>)
              :rows.map(r=>(
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.type}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${sColor[r.status]??'bg-gray-500/20 text-gray-400'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.sector??'—'}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.postDate?new Date(r.postDate).toLocaleDateString():'—'}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-[hsl(var(--muted-foreground))]">{r.notes??'—'}</td>
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
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Page {page} of {tp}</span>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"><ChevronLeft size={16}/></button>
            <button disabled={page===tp} onClick={()=>setPage(p=>p+1)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"><ChevronRight size={16}/></button>
          </div>
        </div>)}
      </div>

      {modal&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]"><h2 className="text-lg font-semibold">{editing?'Edit':'New'} Content</h2><button onClick={()=>setModal(false)} className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg"><X size={18}/></button></div>
          <form onSubmit={save} className="p-6 space-y-4">
            {error&&<div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}
            <div><label className="block text-sm font-medium mb-1.5">Name *</label><input className={iCls} value={form.name} onChange={u('name')} required/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Type *</label><select className={iCls} value={form.type} onChange={u('type')} required><option value="">Select…</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1.5">Status *</label><select className={iCls} value={form.status} onChange={u('status')} required><option value="">Select…</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Sector</label><select className={iCls} value={form.sector} onChange={u('sector')}><option value="">None</option>{SECTORS.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1.5">Post Date</label><input className={iCls} type="date" value={form.postDate} onChange={u('postDate')}/></div>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">Notes</label><textarea className={iCls} rows={3} value={form.notes} onChange={u('notes')}/></div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={()=>setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))]">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving?'Saving…':editing?'Update':'Create'}</button>
            </div>
          </form>
        </div>
      </div>)}
      {delId&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] w-full max-w-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">Delete Content?</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={()=>setDelId(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))]">Cancel</button>
            <button onClick={del} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">Delete</button>
          </div>
        </div>
      </div>)}
    </div>
  );
}
