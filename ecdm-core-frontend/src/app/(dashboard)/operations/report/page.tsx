'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Star, Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';

interface Report { _id: string; employee?: { firstName: string; lastName: string }; evaluationPeriod: { startDate: string; endDate: string }; punctualityScore: number; completionRate: number; taskQualityScore: number; overallPerformanceScore: number; notes?: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

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
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/operations/report', { params: { page, limit: lim } });
      setReports(data.data.data); setTotal(data.data.pagination.total);
    } catch { }
    setLoading(false);
  }, [page]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { setForm({ punctualityScore: '', completionRate: '', taskQualityScore: '' }); setError(''); setModal(true); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Star className="h-7 w-7 text-[hsl(var(--primary))]" /><h1 className="text-2xl font-bold">Performance Reports</h1></div>
        <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"><Plus className="h-4 w-4" />Add Report</button>
      </div>

      <div className="overflow-x-auto">
        <DataTable
          data={reports}
          columns={[
            { key: "employee.firstName", header: "Employee", render: (row: any) => <span className="font-medium">{row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '—'}</span> },
            {
              key: "evaluationPeriod", header: "Period", render: (row: any) => (
                <span className="text-[hsl(var(--muted-foreground))]">
                  <div>{new Date(row.evaluationPeriod.startDate).toLocaleDateString()}</div>
                  <div className="text-xs">→ {new Date(row.evaluationPeriod.endDate).toLocaleDateString()}</div>
                </span>
              )
            },
            { key: "punctualityScore", header: "Punctuality", render: (row: any) => <span><ScoreBadge val={row.punctualityScore} /></span> },
            { key: "completionRate", header: "Completion", render: (row: any) => <span><ScoreBadge val={row.completionRate} /></span> },
            { key: "taskQualityScore", header: "Quality", render: (row: any) => <span className="text-sm font-medium">{row.taskQualityScore} / 5</span> },
            { key: "overallPerformanceScore", header: "Overall Score", render: (row: any) => <span className="min-w-[160px] block"><ScoreBar val={row.overallPerformanceScore} /></span> },
            { key: "notes", header: "Notes", render: (row: any) => <span className="max-w-[200px] truncate block" title={row.notes}>{row.notes || '—'}</span> },
          ]}
          loading={loading}
          emptyMessage="No reports found."
          page={page}
          totalPages={tp}
          totalItems={total}
          itemsPerPage={lim}
          onPageChange={setPage}
          renderActions={(row: Report) => (
            <button onClick={() => setDelId(row._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          )}
          defaultVisibility={{
            notes: false,
          }}
        />
      </div>



      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">New Performance Report</h2><button onClick={() => setModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={save} className="space-y-4">
              <input placeholder="Employee ID" value={form.employee || ''} onChange={u('employee')} className={iCls} />
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
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">{saving ? 'Saving…' : 'Save Report'}</button><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <p className="mb-4 font-semibold">Delete this report?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
