'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { TrendingUp, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Customer { _id: string; name: string; phone: string; }
interface User     { _id: string; firstName: string; lastName: string; }
interface SalesLead { _id: string; customer: Customer; salesPerson: User; platform: string; typeOfOrder: string; followUpRequired: boolean; followUpDate?: string; notes?: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const PLATFORMS  = ['Online','Phone','In-Side','Out-Side'];
const ORDER_TYPES = ['Maintenance','General supplies','Supply and installation'];
const blank = { customer:'', salesPerson:'', platform:'', typeOfOrder:'', followUpRequired:'false', followUpDate:'', notes:'' };
const fuColor: Record<string,string> = { true:'bg-yellow-500/20 text-yellow-400', false:'bg-gray-500/20 text-gray-400' };

export default function SalesLeadsPage() {
  const [rows,setRows]     = useState<SalesLead[]>([]);
  const [total,setTotal]   = useState(0); const [page,setPage] = useState(1);
  const [fPlatform,setFPlatform] = useState(''); const [fType,setFType] = useState('');
  const [loading,setLoading] = useState(true); const [modal,setModal] = useState(false);
  const [editing,setEditing] = useState<SalesLead|null>(null);
  const [form,setForm]       = useState(blank);
  const [saving,setSaving]   = useState(false); const [error,setError] = useState('');
  const [delId,setDelId]     = useState<string|null>(null);
  const [customers,setCustomers] = useState<Customer[]>([]);
  const [users,setUsers]         = useState<User[]>([]);
  const lim=10; const tp=Math.ceil(total/lim);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string,string|number> = {page,limit:lim};
      if (fPlatform) p.platform=fPlatform; if (fType) p.typeOfOrder=fType;
      const {data} = await api.get('/crm/sales-leads',{params:p});
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch {} setLoading(false);
  },[page,fPlatform,fType]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    api.get('/crm/customers',{params:{limit:200}}).then(({data})=>setCustomers(data.data.data)).catch(()=>{});
    api.get('/erp/employees',{params:{limit:200}}).then(({data})=>setUsers(data.data.data)).catch(()=>{});
  },[]);

  const openC = ()=>{setEditing(null);setForm(blank);setError('');setModal(true);};
  const openE = (r: SalesLead)=>{
    setEditing(r);
    setForm({customer:r.customer?._id??'',salesPerson:r.salesPerson?._id??'',platform:r.platform,typeOfOrder:r.typeOfOrder,
      followUpRequired:String(r.followUpRequired),followUpDate:r.followUpDate?r.followUpDate.slice(0,10):'',notes:r.notes??''});
    setError('');setModal(true);
  };
  const save = async (ev: React.FormEvent)=>{
    ev.preventDefault();setSaving(true);setError('');
    const pl: Record<string,unknown> = {customer:form.customer,salesPerson:form.salesPerson,platform:form.platform,typeOfOrder:form.typeOfOrder,followUpRequired:form.followUpRequired==='true'};
    if (form.followUpDate) pl.followUpDate=form.followUpDate; if (form.notes) pl.notes=form.notes;
    try {
      if (editing) await api.put(`/crm/sales-leads/${editing._id}`,pl);
      else await api.post('/crm/sales-leads',pl);
      setModal(false);load();
    } catch(e:unknown){setError((e as {response?:{data?:{message?:string}}}).response?.data?.message||'Failed');}
    setSaving(false);
  };
  const del = async ()=>{if(!delId)return;try{await api.delete(`/crm/sales-leads/${delId}`);load();}catch{}setDelId(null);};
  const u=(f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/20 flex items-center justify-center"><TrendingUp size={20} className="text-[hsl(var(--primary))]"/></div>
          <div><h1 className="text-2xl font-bold">Sales Leads</h1><p className="text-sm text-[hsl(var(--muted-foreground))]">{total} total</p></div>
        </div>
        <button onClick={openC} className="flex items-center gap-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"><Plus size={16}/>New Lead</button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <select value={fPlatform} onChange={e=>{setFPlatform(e.target.value);setPage(1);}} className={iCls+' !w-44'}><option value="">All Platforms</option>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select>
        <select value={fType} onChange={e=>{setFType(e.target.value);setPage(1);}} className={iCls+' !w-56'}><option value="">All Order Types</option>{ORDER_TYPES.map(t=><option key={t}>{t}</option>)}</select>
      </div>
      <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{['Customer','Sales Person','Platform','Order Type','Follow-Up','Date','Notes','Actions'].map(h=><th key={h} className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading?(<tr><td colSpan={8} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Loading…</td></tr>)
              :rows.length===0?(<tr><td colSpan={8} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">No leads found</td></tr>)
              :rows.map(r=>(
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.customer?.name??'—'}<div className="text-xs text-[hsl(var(--muted-foreground))]">{r.customer?.phone}</div></td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.salesPerson?`${r.salesPerson.firstName} ${r.salesPerson.lastName}`:'—'}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.platform}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.typeOfOrder}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${fuColor[String(r.followUpRequired)]??'bg-gray-500/20 text-gray-400'}`}>{r.followUpRequired?'Yes':'No'}</span></td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.followUpDate?new Date(r.followUpDate).toLocaleDateString():'—'}</td>
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
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Page {page} of {tp}</span>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"><ChevronLeft size={16}/></button>
            <button disabled={page===tp} onClick={()=>setPage(p=>p+1)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"><ChevronRight size={16}/></button>
          </div>
        </div>)}
      </div>
      {modal&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]"><h2 className="text-lg font-semibold">{editing?'Edit':'New'} Lead</h2><button onClick={()=>setModal(false)} className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg"><X size={18}/></button></div>
          <form onSubmit={save} className="p-6 space-y-4">
            {error&&<div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}
            <div><label className="block text-sm font-medium mb-1.5">Customer *</label>
              <select className={iCls} value={form.customer} onChange={u('customer')} required><option value="">Select customer…</option>{customers.map(c=><option key={c._id} value={c._id}>{c.name} — {c.phone}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1.5">Sales Person *</label>
              <select className={iCls} value={form.salesPerson} onChange={u('salesPerson')} required><option value="">Select sales person…</option>{users.map(u2=><option key={u2._id} value={u2._id}>{u2.firstName} {u2.lastName}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Platform *</label><select className={iCls} value={form.platform} onChange={u('platform')} required><option value="">Select…</option>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1.5">Order Type *</label><select className={iCls} value={form.typeOfOrder} onChange={u('typeOfOrder')} required><option value="">Select…</option>{ORDER_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Follow-Up Required</label><select className={iCls} value={form.followUpRequired} onChange={u('followUpRequired')}><option value="false">No</option><option value="true">Yes</option></select></div>
              <div><label className="block text-sm font-medium mb-1.5">Follow-Up Date</label><input className={iCls} type="date" value={form.followUpDate} onChange={u('followUpDate')}/></div>
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
          <h2 className="text-lg font-semibold">Delete Lead?</h2>
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
