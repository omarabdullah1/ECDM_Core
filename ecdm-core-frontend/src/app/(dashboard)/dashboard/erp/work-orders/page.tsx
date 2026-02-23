'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Wrench, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { useT } from '@/i18n/useT';

interface Customer { _id: string; name: string; phone: string; }
interface Engineer { _id: string; firstName: string; lastName: string; }
interface WorkOrder { _id: string; customer: Customer; assignedEngineer: Engineer; typeOfOrder: string; issue: string; visitSiteDate?: string; startMaintenanceDate?: string; endMaintenanceDate?: string; punctuality?: string; notes?: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const ORDER_TYPES  = ['Maintenance','General supplies','Supply and installation'];
const PUNCTUALITIES = ['On-Time','Late'];
const blank = { customer:'', assignedEngineer:'', typeOfOrder:'', issue:'', visitSiteDate:'', startMaintenanceDate:'', endMaintenanceDate:'', punctuality:'', notes:'' };
const pColor: Record<string,string> = { 'On-Time':'bg-green-500/20 text-green-400', Late:'bg-red-500/20 text-red-400' };

export default function WorkOrdersPage() {
  const t = useT();
  const [rows,setRows]     = useState<WorkOrder[]>([]);
  const [total,setTotal]   = useState(0); const [page,setPage] = useState(1);
  const [fType,setFType]   = useState(''); const [fPunct,setFPunct] = useState('');
  const [loading,setLoading] = useState(true); const [modal,setModal] = useState(false);
  const [editing,setEditing] = useState<WorkOrder|null>(null);
  const [form,setForm]       = useState(blank); const [saving,setSaving] = useState(false);
  const [error,setError]     = useState(''); const [delId,setDelId] = useState<string|null>(null);
  const [customers,setCustomers] = useState<Customer[]>([]);
  const [engineers,setEngineers] = useState<Engineer[]>([]);
  const lim=10; const tp=Math.ceil(total/lim);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string,string|number> = {page,limit:lim};
      if (fType)  p.typeOfOrder = fType;
      if (fPunct) p.punctuality = fPunct;
      const {data} = await api.get('/erp/work-orders',{params:p});
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch {} setLoading(false);
  },[page,fType,fPunct]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    api.get('/crm/customers',{params:{limit:200}}).then(({data})=>setCustomers(data.data.data)).catch(()=>{});
    api.get('/erp/employees',{params:{limit:200}}).then(({data})=>setEngineers(data.data.data)).catch(()=>{});
  },[]);

  const openC=()=>{setEditing(null);setForm(blank);setError('');setModal(true);};
  const openE=(r:WorkOrder)=>{
    setEditing(r);
    setForm({customer:r.customer?._id??'',assignedEngineer:r.assignedEngineer?._id??'',typeOfOrder:r.typeOfOrder,issue:r.issue,
      visitSiteDate:r.visitSiteDate?r.visitSiteDate.slice(0,10):'',
      startMaintenanceDate:r.startMaintenanceDate?r.startMaintenanceDate.slice(0,10):'',
      endMaintenanceDate:r.endMaintenanceDate?r.endMaintenanceDate.slice(0,10):'',
      punctuality:r.punctuality??'',notes:r.notes??''});
    setError('');setModal(true);
  };
  const save=async(ev:React.FormEvent)=>{
    ev.preventDefault();setSaving(true);setError('');
    const pl:Record<string,unknown>={customer:form.customer,assignedEngineer:form.assignedEngineer,typeOfOrder:form.typeOfOrder,issue:form.issue};
    if(form.visitSiteDate)pl.visitSiteDate=form.visitSiteDate;
    if(form.startMaintenanceDate)pl.startMaintenanceDate=form.startMaintenanceDate;
    if(form.endMaintenanceDate)pl.endMaintenanceDate=form.endMaintenanceDate;
    if(form.punctuality)pl.punctuality=form.punctuality;
    if(form.notes)pl.notes=form.notes;
    try{
      if(editing)await api.put(`/erp/work-orders/${editing._id}`,pl);
      else await api.post('/erp/work-orders',pl);
      setModal(false);load();
    }catch(e:unknown){setError((e as {response?:{data?:{message?:string}}}).response?.data?.message||'Failed');}
    setSaving(false);
  };
  const del=async()=>{if(!delId)return;try{await api.delete(`/erp/work-orders/${delId}`);load();}catch{}setDelId(null);};
  const u=(f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/20 flex items-center justify-center"><Wrench size={20} className="text-[hsl(var(--primary))]"/></div>
          <div><h1 className="text-2xl font-bold">{t.pages.workOrders.title}</h1><p className="text-sm text-[hsl(var(--muted-foreground))]">{total} {t.common.total}</p></div>
        </div>
        <button onClick={openC} className="flex items-center gap-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"><Plus size={16}/>{t.pages.workOrders.addBtn}</button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <select value={fType} onChange={e=>{setFType(e.target.value);setPage(1);}} className={iCls+' !w-56'}><option value="">{t.pages.workOrders.allOrderTypes}</option>{ORDER_TYPES.map(tp=><option key={tp}>{tp}</option>)}</select>
        <select value={fPunct} onChange={e=>{setFPunct(e.target.value);setPage(1);}} className={iCls+' !w-40'}><option value="">{t.common.punctuality}</option>{PUNCTUALITIES.map(p=><option key={p}>{p}</option>)}</select>
      </div>
      <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{[t.common.customer, t.common.engineer, t.common.type, t.common.issue, t.common.siteVisit, t.common.punctuality, t.common.notes, t.common.actions].map(h=><th key={h} className="px-4 py-3 text-start font-medium text-[hsl(var(--muted-foreground))]">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading?(<tr><td colSpan={8} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.common.loading}</td></tr>)
              :rows.length===0?(<tr><td colSpan={8} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.pages.workOrders.emptyState}</td></tr>)
              :rows.map(r=>(
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.customer?.name??'—'}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.assignedEngineer?`${r.assignedEngineer.firstName} ${r.assignedEngineer.lastName}`:'—'}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.typeOfOrder}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] max-w-44 truncate">{r.issue}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1"><Clock size={12}/>{r.visitSiteDate?new Date(r.visitSiteDate).toLocaleDateString():'—'}</span></td>
                  <td className="px-4 py-3">{r.punctuality?<span className={`px-2 py-1 rounded-lg text-xs font-medium ${pColor[r.punctuality]??'bg-gray-500/20 text-gray-400'}`}>{r.punctuality}</span>:<span className="text-[hsl(var(--muted-foreground))]">—</span>}</td>
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
      {modal&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]"><h2 className="text-lg font-semibold">{editing ? t.common.edit : t.pages.workOrders.addBtn}</h2><button onClick={()=>setModal(false)} className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg"><X size={18}/></button></div>
          <form onSubmit={save} className="p-6 space-y-4">
            {error&&<div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{error}</div>}
            <div><label className="block text-sm font-medium mb-1.5">{t.common.customer} *</label>
              <select className={iCls} value={form.customer} onChange={u('customer')} required><option value="">{t.common.selectCustomer}</option>{customers.map(c=><option key={c._id} value={c._id}>{c.name} — {c.phone}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1.5">{t.pages.workOrders.assignedEngineer} *</label>
              <select className={iCls} value={form.assignedEngineer} onChange={u('assignedEngineer')} required><option value="">{t.common.selectEngineer}</option>{engineers.map(e=><option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1.5">{t.common.orderType} *</label>
              <select className={iCls} value={form.typeOfOrder} onChange={u('typeOfOrder')} required><option value="">{t.common.select}</option>{ORDER_TYPES.map(tp=><option key={tp}>{tp}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1.5">{t.pages.workOrders.issueDesc} *</label><textarea className={iCls} rows={3} value={form.issue} onChange={u('issue')} required/></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">{t.common.siteVisit}</label><input className={iCls} type="date" value={form.visitSiteDate} onChange={u('visitSiteDate')}/></div>
              <div><label className="block text-sm font-medium mb-1.5">{t.common.startDate}</label><input className={iCls} type="date" value={form.startMaintenanceDate} onChange={u('startMaintenanceDate')}/></div>
              <div><label className="block text-sm font-medium mb-1.5">{t.common.endDate}</label><input className={iCls} type="date" value={form.endMaintenanceDate} onChange={u('endMaintenanceDate')}/></div>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">{t.common.punctuality}</label>
              <select className={iCls} value={form.punctuality} onChange={u('punctuality')}><option value="">{t.pages.workOrders.notSet}</option>{PUNCTUALITIES.map(p=><option key={p}>{p}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1.5">{t.common.notes}</label><textarea className={iCls} rows={2} value={form.notes} onChange={u('notes')}/></div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={()=>setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))]">{t.common.cancel}</button>
              <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? t.common.saving : editing ? t.common.update : t.common.create}</button>
            </div>
          </form>
        </div>
      </div>)}
      {delId&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] w-full max-w-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t.pages.workOrders.deleteTitle}</h2>
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
