'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Star, ChevronLeft, ChevronRight, TrendingUp, Award } from 'lucide-react';
import { useT } from '@/i18n/useT';

interface Engineer { _id: string; firstName: string; lastName: string; }
interface Evaluation {
  _id: string; employee: Engineer;
  evaluationPeriod: { startDate: string; endDate?: string };
  punctualityScore?: number; taskCompletedCount?: number; taskReturnedCount?: number;
  completionRate?: number; returnRate?: number; taskQualityScore?: number; overallPerformanceScore?: number; notes?: string;
}

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

const scoreColor = (n?: number) => !n ? 'text-[hsl(var(--muted-foreground))]' : n >= 80 ? 'text-green-400' : n >= 60 ? 'text-yellow-400' : 'text-red-400';
const ScoreBar = ({ value }: { value?: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 bg-[hsl(var(--muted))]/40 rounded-full h-1.5">
      <div className="bg-[hsl(var(--primary))] h-1.5 rounded-full" style={{ width: `${Math.min(100, value ?? 0)}%` }}/>
    </div>
    <span className={`text-xs font-medium w-8 text-end ${scoreColor(value)}`}>{value?.toFixed(0) ?? '—'}</span>
  </div>
);

export default function EmployeeEvaluationsPage() {
  const t = useT();
  const [rows,setRows]     = useState<Evaluation[]>([]);
  const [total,setTotal]   = useState(0); const [page,setPage] = useState(1);
  const [fEmployee,setFEmployee] = useState('');
  const [loading,setLoading] = useState(true);
  const [employees,setEmployees] = useState<Engineer[]>([]);
  const lim=10; const tp=Math.ceil(total/lim);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string,string|number> = {page,limit:lim};
      if (fEmployee) p.employee=fEmployee;
      const {data} = await api.get('/erp/employee-evaluations',{params:p});
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch {} setLoading(false);
  },[page,fEmployee]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    api.get('/erp/employees',{params:{limit:200}}).then(({data})=>setEmployees(data.data.data)).catch(()=>{});
  },[]);

  const headers = [t.common.engineer, t.common.period, t.common.punctualityPct, t.common.completed, t.common.returned, t.common.returnRate, t.common.completionRate, t.common.quality, t.common.overall, t.common.notes];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/20 flex items-center justify-center"><Star size={20} className="text-[hsl(var(--primary))]"/></div>
        <div>
          <h1 className="text-2xl font-bold">{t.pages.employeeEvals.title}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{total} {t.pages.employeeEvals.subtitle}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--primary))]/5 p-4 flex flex-wrap gap-6 text-xs text-[hsl(var(--muted-foreground))]">
        <span className="flex items-center gap-1.5"><TrendingUp size={13} className="text-[hsl(var(--primary))]"/>{t.pages.employeeEvals.scoreBanner}</span>
        <span className="flex items-center gap-1.5"><Award size={13} className="text-yellow-400"/>{t.pages.employeeEvals.scoreBannerSub}</span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={fEmployee} onChange={e=>{setFEmployee(e.target.value);setPage(1);}} className={iCls+' !w-56'}><option value="">{t.pages.employeeEvals.allEngineers}</option>{employees.map(e=><option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}</select>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>{headers.map((h,i)=><th key={i} className="px-4 py-3 text-start font-medium text-[hsl(var(--muted-foreground))]">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading?(<tr><td colSpan={10} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.common.loading}</td></tr>)
              :rows.length===0?(<tr><td colSpan={10} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.pages.employeeEvals.emptyState}</td></tr>)
              :rows.map(r=>(
                <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-3 font-medium">{r.employee?`${r.employee.firstName} ${r.employee.lastName}`:'—'}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] text-xs whitespace-nowrap">
                    {new Date(r.evaluationPeriod.startDate).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}
                    {r.evaluationPeriod.endDate && <> → {new Date(r.evaluationPeriod.endDate).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</>}
                  </td>
                  <td className="px-4 py-4 w-28"><ScoreBar value={r.punctualityScore}/></td>
                  <td className="px-4 py-3 text-center text-[hsl(var(--muted-foreground))]">{r.taskCompletedCount??'—'}</td>
                  <td className="px-4 py-3 text-center text-[hsl(var(--muted-foreground))]">{r.taskReturnedCount??'—'}</td>
                  <td className="px-4 py-4 w-28"><ScoreBar value={r.returnRate}/></td>
                  <td className="px-4 py-4 w-28"><ScoreBar value={r.completionRate}/></td>
                  <td className="px-4 py-3 text-center"><span className={scoreColor(r.taskQualityScore ? r.taskQualityScore*20 : undefined)}>{r.taskQualityScore?.toFixed(2)??'—'}/5</span></td>
                  <td className="px-4 py-4 w-28"><ScoreBar value={r.overallPerformanceScore}/></td>
                  <td className="px-4 py-3 max-w-[160px] truncate text-xs text-[hsl(var(--muted-foreground))]">{r.notes??'—'}</td>
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
    </div>
  );
}
