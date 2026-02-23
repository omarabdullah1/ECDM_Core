'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { ShoppingCart, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Customer  { _id: string; name: string; phone: string; }
interface SalesLead { _id: string; typeOfOrder: string; }
interface SalesOrder { _id: string; customer: Customer; salesLead?: SalesLead; issueDescription: string; siteInspectionDate?: string; technicalInspection?: boolean; quotationNumber?: string; quotationStatus?: string; finalStatus?: string; notes?: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const Q_STATUSES = ['Accepted','Rejected','Negotiation','Pending','Expired'];
const F_STATUSES = ['Won','Lost','Pending'];
const blank = { customer:'', salesLead:'', issueDescription:'', siteInspectionDate:'', technicalInspection:'false', technicalInspectionDetails:'', quotationNumber:'', quotationStatus:'', finalStatus:'', notes:'' };
const qColor: Record<string,string> = { Accepted:'bg-green-500/20 text-green-400', Rejected:'bg-red-500/20 text-red-400', Negotiation:'bg-yellow-500/20 text-yellow-400', Pending:'bg-blue-500/20 text-blue-400', Expired:'bg-gray-500/20 text-gray-400' };

export default function SalesOrdersPage() {
  const [rows,setRows]       = useState<SalesOrder[]>([]);
  const [total,setTotal]     = useState(0); const [page,setPage] = useState(1);
  const [fQStatus,setFQStatus] = useState(''); const [fFStatus,setFFStatus] = useState('');
  const [loading,setLoading] = useState(true); const [modal,setModal] = useState(false);
  const [editing,setEditing] = useState<SalesOrder|null>(null);
  const [form,setForm]       = useState(blank); const [saving,setSaving] = useState(false);
  const [error,setError]     = useState(''); const [delId,setDelId] = useState<string|null>(null);
  const [customers,setCustomers] = useState<Customer[]>([]);
  const [leads,setLeads]         = useState<SalesLead[]>([]);
  const lim=10; const tp=Math.ceil(total/lim);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string,string|number> = {page,limit:lim};
      if (fQStatus) p.quotationStatus=fQStatus; if (fFStatus) p.finalStatus=fFStatus;
      const {data} = await api.get('/crm/sales-orders',{params:p});
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch {} setLoading(false);
  },[page,fQStatus,fFStatus]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    api.get('/crm/customers',{params:{limit:200}}).then(({data})=>setCustomers(data.data.data)).catch(()=>{});
    api.get('/crm/sales-leads',{params:{limit:200}}).then(({data})=>setLeads(data.data.data)).catch(()=>{});
  },[]);

  const openC=()=>{setEditing(null);setForm(blank);setError('');setModal(true);};
  const openE=(r:SalesOrder)=>{
    setEditing(r);
    setForm({customer:r.customer?._id??'',salesLead:r.salesLead?._id??'',issueDescription:r.issueDescription,
      siteInspectionDate:r.siteInspectionDate?r.siteInspectionDate.slice(0,10):'',
      technicalInspection:String(r.technicalInspection??false),technicalInspectionDetails:'',
      quotationNumber:r.quotationNumber??'',quotationStatus:r.quotationStatus??'',finalStatus:r.finalStatus??'',notes:r.notes??''});
    setError('');setModal(true);
  };
  const save=async(ev:React.FormEvent)=>{
    ev.preventDefault();setSaving(true);setError('');
    const pl:Record<string,unknown>={customer:form.customer,issueDescription:form.issueDescription,technicalInspection:form.technicalInspection==='true'};
    if(form.salesLead)pl.salesLead=form.salesLead;
    if(form.siteInspectionDate)pl.siteInspectionDate=form.siteInspectionDate;
    if(form.quotationNumber)pl.quotationNumber=form.quotationNumber;
    if(form.quotationStatus)pl.quotationStatus=form.quotationStatus;
    if(form.finalStatus)pl.finalStatus=form.finalStatus;
    if(form.notes)pl.notes=form.notes;
    try{
      if(editing)await api.put(`/crm/sales-orders/${editing._id}`,pl);
      else await api.post('/crm/sales-orders',pl);
      setModal(false);load();
    }catch(e:unknown){setError((e as {response?:{data?:{message?:string}}}).response?.data?.message||'Failed');}
    setSaving(false);
  };
  const del=async()=>{if(!delId)return;try{await api.delete(`/crm/sales-orders/${delId}`);load();}catch{}setDelId(null);};
  const u=(f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/20 flex items-center justify-center"><ShoppingCart size={20} className="text-[hsl(var(--primary))]"/></div>
          <div><h1 className="text-2xl font-bold">Sales Orders</h1><p className="text-sm text-[hsl(var(--muted-foreground))]">{total} total</p></div>
        </div>
        <button onClick={openC} className="flex items-center gap-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"><Plus size={16}/>New Order</button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <select value={fQStatus} onChange={e=>{setFQStatus(e.target.value);setPage(1);}} className={iCls+' !w-48'}><option value="">Quotation Status</option>{Q_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select value={fFStatus} onChange={e=>{setFFStatus(e.target.value);setPage(1);}} className={iCls+' !w-44'}><option value="">Final Status</option>{F_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      </div>
      <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{['Customer','Issue','Inspection Date','Quotation #','Q. Status','Final','Notes','Actions'].map(h=><th key={h} className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading?(<tr><td colSpan={8} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Loading…</td></tr>)
              :rows.length===0?(<tr><td colSpan={8} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">No orders found</td></tr>)
              :rows.map(r=>(
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.customer?.name??'—'}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] max-w-44 truncate">{r.issueDescription}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                    <span className={`px-2 py-1 rounded-lg font-medium ${r.technicalInspection?'bg-green-500/20 text-green-400':'bg-gray-500/20 text-gray-400'}`}>{r.technicalInspection?'Done':'No'}</span>
                    {r.siteInspectionDate&&<div className="mt-1">{new Date(r.siteInspectionDate).toLocaleDateString()}</div>}
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.quotationNumber??'—'}</td>
                  <td className="px-4 py-3">{r.quotationStatus?<span className={`px-2 py-1 rounded-lg text-xs font-medium ${qColor[r.quotationStatus]??'bg-gray-500/20 text-gray-400'}`}>{r.quotationStatus}</span>:'—'}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{r.finalStatus??'—'}</td>
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
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]"><h2 className="text-lg font-semibold">{editing?'Edit':'New'} Sales Order</h2><button onClick={()=>setModal(false)} className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg"><X size={18}/></button></div>
          <form onSubmit={save} className="p-6 space-y-4">
            {error&&<div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}
            <div><label className="block text-sm font-medium mb-1.5">Customer *</label>
              <select className={iCls} value={form.customer} onChange={u('customer')} required><option value="">Select customer…</option>{customers.map(c=><option key={c._id} value={c._id}>{c.name} — {c.phone}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1.5">Linked Sales Lead</label>
              <select className={iCls} value={form.salesLead} onChange={u('salesLead')}><option value="">None</option>{leads.map(l=><option key={l._id} value={l._id}>{l._id} — {l.typeOfOrder}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1.5">Issue Description *</label><textarea className={iCls} rows={3} value={form.issueDescription} onChange={u('issueDescription')} required/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Site Inspection Date</label><input className={iCls} type="date" value={form.siteInspectionDate} onChange={u('siteInspectionDate')}/></div>
              <div><label className="block text-sm font-medium mb-1.5">Technical Inspection</label><select className={iCls} value={form.technicalInspection} onChange={u('technicalInspection')}><option value="false">No</option><option value="true">Yes</option></select></div>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">Quotation Number / Link</label><input className={iCls} value={form.quotationNumber} onChange={u('quotationNumber')}/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Quotation Status</label><select className={iCls} value={form.quotationStatus} onChange={u('quotationStatus')}><option value="">Select…</option>{Q_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1.5">Final Status</label><select className={iCls} value={form.finalStatus} onChange={u('finalStatus')}><option value="">Select…</option>{F_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">Notes</label><textarea className={iCls} rows={2} value={form.notes} onChange={u('notes')}/></div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={()=>setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))]">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving?'Saving…':editing?'Update':'Create'}</button>
            </div>
          </form>
        </div>
      </div>)}
      {delId&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] w-full max-w-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">Delete Sales Order?</h2>
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