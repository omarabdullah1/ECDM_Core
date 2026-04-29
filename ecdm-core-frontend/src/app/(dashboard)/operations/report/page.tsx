'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/features/auth/useAuth';
import toast from 'react-hot-toast';
import { Star, Plus, Trash2, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';

interface Report { _id: string; employee?: { firstName: string; lastName: string }; evaluationPeriod: { startDate: string; endDate: string }; punctualityScore: number; completionRate: number; taskQualityScore: number; overallPerformanceScore: number; notes?: string; }

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';

function ScoreBadge({ val }: { val: number }) {
  const color = val >= 80 ? 'bg-green-100 text-green-700' : val >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{val.toFixed(1)}%</span>;
}

function ScoreBar({ val }: { val: number }) {
  const color = val >= 80 ? 'bg-green-500' : val >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1"><span className="text-sm font-semibold">{val.toFixed(1)}%</span></div>
      <div className="h-2 w-full rounded-full bg-[hsl(var(--muted))]"><div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${Math.min(val, 100)}%` }} /></div>
    </div>
  );
}

export default function ReportPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const lim = 10; const tp = Math.ceil(total / lim);

  const [employees, setEmployees] = useState<{ _id: string; firstName: string; lastName: string; department: string }[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/operations/report/auto');
      setReports(data.data || []);
      setTotal(data.data?.length || 0);
    } catch { 
      setReports([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const [ops, eng] = await Promise.all([
          api.get('/shared/employees', { params: { department: 'Operations', limit: 100 } }),
          api.get('/shared/employees', { params: { department: 'Engineering', limit: 100 } })
        ]);
        const all = [...(ops.data.data.data || []), ...(eng.data.data.data || [])];
        setEmployees(all);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
      setLoadingEmployees(false);
    };
    fetchEmployees();
  }, []);

  const openC = () => { setForm({ employee: '', punctualityScore: '', completionRate: '', taskQualityScore: '' }); setError(''); setModal(true); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [f]: e.target.value }));
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl = {
      employee: form.employee || undefined,
      evaluationPeriod: { startDate: form.startDate, endDate: form.endDate },
      punctualityScore: Number(form.punctualityScore),
      completionRate: Number(form.completionRate),
      taskQualityScore: Number(form.taskQualityScore),
      notes: form.notes || undefined,
    };
    try { await api.post('/operations/report', pl); setModal(false); fetch_(); }
    catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  const del = async () => {
    if (!delId) return;
    try { await api.delete(`/operations/report/${delId}`); fetch_(); } catch { } setDelId(null);
  };

  const syncAuto = async () => {
    setSyncing(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      
      await api.post('/operations/report/generate-bulk', { 
        startDate: start, 
        endDate: end 
      });
      
      toast.success('Performance reports synchronized successfully for current month');
      fetch_();
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('Failed to sync automatic reports');
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Performance Reports"
        icon={Star}
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <button 
                onClick={syncAuto} 
                disabled={syncing}
                className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium shadow-sm hover:bg-[hsl(var(--accent))] transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Auto Reports'}
              </button>
            )}
            {isAdmin && (
              <button onClick={openC} className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 border-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"><Plus className="h-4 w-4" />Add Report</button>
            )}
          </div>
        }
      />

      <div className="w-full">
        <DataTable
          data={reports}
          columns={[
            { key: "employee.firstName", header: "Employee",
      className: 'md:w-1/6 md:max-w-[120px] md:truncate', render: (row: any) => <span className="font-medium">{row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '—'}</span> },
            {
              key: "evaluationPeriod", header: "Period",
      className: 'md:w-1/6 md:max-w-[120px] md:truncate', render: (row: any) => (
                <span className="text-[hsl(var(--muted-foreground))]">
                  <div>{new Date(row.evaluationPeriod.startDate).toLocaleDateString()}</div>
                  <div className="text-xs">→ {new Date(row.evaluationPeriod.endDate).toLocaleDateString()}</div>
                </span>
              )
            },
            { key: "punctualityScore", header: "Punctuality",
      className: 'md:w-1/6 md:max-w-[120px] md:truncate', render: (row: any) => <span><ScoreBadge val={row.punctualityScore} /></span> },
            { key: "completionRate", header: "Completion",
      className: 'md:w-1/6 md:max-w-[120px] md:truncate', render: (row: any) => <span><ScoreBadge val={row.completionRate} /></span> },
            { key: "taskQualityScore", header: "Quality",
      className: 'md:w-1/6 md:max-w-[120px] md:truncate', render: (row: any) => <span className="text-sm font-medium">{row.taskQualityScore} / 5</span> },
            { key: "overallPerformanceScore", header: "Overall Score",
      className: 'md:w-1/6 md:max-w-[120px] md:truncate', render: (row: any) => <span className="min-w-[160px] block"><ScoreBar val={row.overallPerformanceScore} /></span> },
            { key: "notes", header: "Notes",
      className: 'md:w-1/6 md:max-w-[120px] md:truncate', render: (row: any) => <span className="max-w-[200px] truncate block" title={row.notes}>{row.notes || '—'}</span> },
          ]}
          loading={loading}
          emptyMessage="No reports found."
          page={page}
          totalPages={tp}
          totalItems={total}
          itemsPerPage={lim}
          onPageChange={setPage}
          renderActions={(row: Report) => (
            isAdmin && (
              <button onClick={() => setDelId(row._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            )
          )}
          defaultVisibility={{
            notes: false,
          }}
        />
      </div>

      {modal && (
        <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in transition-all">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] modern-glass-card m-auto relative premium-shadow animate-in-slide p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">New Performance Report</h2><button onClick={() => setModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={save} className="space-y-4">
              <select 
                required 
                value={form.employee || ''} 
                onChange={u('employee')} 
                className={iCls}
                disabled={loadingEmployees}
              >
                <option value="">{loadingEmployees ? 'Loading employees...' : 'Select Employee...'}</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.department})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Period Start</label><input required type="date" value={form.startDate || ''} onChange={u('startDate')} className={iCls} /></div>
                <div><label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Period End</label><input required type="date" value={form.endDate || ''} onChange={u('endDate')} className={iCls} /></div>
              </div>
              <div><label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Punctuality Score (0–100)</label><input required type="number" min="0" max="100" placeholder="e.g. 85" value={form.punctualityScore || ''} onChange={u('punctualityScore')} className={iCls} /></div>
              <div><label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Completion Rate (0–100)</label><input required type="number" min="0" max="100" placeholder="e.g. 90" value={form.completionRate || ''} onChange={u('completionRate')} className={iCls} /></div>
              <div><label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Task Quality Score (0–5)</label><input required type="number" min="0" max="5" step="0.1" placeholder="e.g. 4.5" value={form.taskQualityScore || ''} onChange={u('taskQualityScore')} className={iCls} /></div>
              <textarea rows={2} placeholder="Notes (optional)" value={form.notes || ''} onChange={u('notes')} className={`${iCls} resize-none`} />
              <div className="rounded-xl bg-[hsl(var(--muted))]/30 p-3 text-xs text-[hsl(var(--muted-foreground))]">
                <strong>Score formula:</strong> Overall = Punctuality×30% + Completion×30% + (Quality/5×100)×40%
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="flex-1 flex-1 rounded-md bg-[hsl(var(--primary))] py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 transition-all focus-visible:outline-none disabled:opacity-60">{saving ? 'Saving…' : 'Save Report'}</button><button type="button" onClick={() => setModal(false)} className="flex-1 flex-1 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-2 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in transition-all">
          <div className="rounded-md border border-[hsl(var(--border))]/50 modern-glass-card premium-shadow animate-in-slide m-auto relative p-6 shadow-lg sm:max-w-md w-full">
            <p className="mb-4 font-semibold">Delete this report?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-md bg-[hsl(var(--destructive))] py-2 text-sm font-medium text-[hsl(var(--destructive-foreground))] shadow-sm transition-all hover:opacity-90 focus-visible:outline-none">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-2 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

