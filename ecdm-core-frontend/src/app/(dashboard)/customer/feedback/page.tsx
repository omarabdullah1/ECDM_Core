'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { MessageSquare, Plus, Trash2, X, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface Customer {
  _id?: string;
  customerId?: string;
  name?: string;
  phone?: string;
}

interface CustomerOrder {
  _id?: string;
  engineerName?: string;
  actualVisitDate?: string;
  startDate?: string;
  endDate?: string;
}

interface User {
  _id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface Feedback {
  _id: string;
  customerId?: Customer;
  customerOrderId?: CustomerOrder;
  solvedIssue?: string;
  ratingOperation?: string;
  followUp?: string;
  ratingCustomerService?: string;
  notes?: string;
  updatedBy?: User;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Helper
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return '-';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Badge Component
// ─────────────────────────────────────────────────────────────────────────────

const Badge = ({ children, variant = 'outline' }: { children: React.ReactNode; variant?: 'default' | 'destructive' | 'outline' }) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

  const variantClasses: Record<string, string> = {
    'default': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'destructive': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'outline': 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  };

  return <span className={`${baseClasses} ${variantClasses[variant]}`}>{children || '-'}</span>;
};

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const blank = { customerId: '', customerOrderId: '', solvedIssue: '', ratingOperation: '', followUp: '', ratingCustomerService: '', notes: '' };

export default function FeedbackPage() {
  const [rows, setRows] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Feedback | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  // Dropdown data
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Fetch lookup data when modal opens
  useEffect(() => {
    if (modal) {
      setLoadingLookups(true);
      Promise.all([
        api.get('/shared/customers?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/customer/orders?limit=1000').catch(() => ({ data: { data: [] } }))
      ])
        .then(([custRes, coRes]) => {
          const custData = custRes.data?.data || custRes.data;
          const coData = coRes.data?.data?.data || coRes.data?.data || coRes.data;
          setCustomers(Array.isArray(custData) ? custData : []);
          setCustomerOrders(Array.isArray(coData) ? coData : []);
        })
        .catch(() => {
          setCustomers([]);
          setCustomerOrders([]);
        })
        .finally(() => setLoadingLookups(false));
    }
  }, [modal]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      const { data } = await api.get('/customer/feedback', { params: p });
      setRows(data.data?.data || []);
      setTotal(data.data?.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
      toast.error('Failed to load feedback');
      setRows([]);
    }
    setLoading(false);
  }, [page]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: Feedback) => {
    setEditing(r);
    setForm({
      customerId: '',
      customerOrderId: '',
      solvedIssue: r.solvedIssue || '',
      ratingOperation: r.ratingOperation || '',
      followUp: r.followUp || '',
      ratingCustomerService: r.ratingCustomerService || '',
      notes: r.notes || ''
    });
    setError('');
    setModal(true);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== '') pl[k] = v;
    }
    try {
      if (editing) await api.put(`/customer/feedback/${editing._id}`, pl);
      else await api.post('/customer/feedback', pl);
      setModal(false); fetch_();
    } catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  const del = async () => { if (!delId) return; try { await api.delete(`/customer/feedback/${delId}`); fetch_(); } catch { } setDelId(null); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  // 13 Columns as specified
  const headers = [
    'Customer ID', 'Name', 'Phone', 'Engineer Name', 'Visit Engineer Date',
    'Start Date', 'End Date', 'Solved Issue', 'Rating Operation',
    'Follow Up', 'Rating CS', 'User Email', 'Notes', 'Actions'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><MessageSquare className="h-7 w-7 text-[hsl(var(--primary))]" /><h1 className="text-2xl font-bold">Feedback</h1></div>
        <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"><Plus className="h-4 w-4" />Add</button>
      </div>

      <div className="overflow-x-auto">
        <DataTable
          data={rows as any}
          columns={[
            { key: "customerId.customerId", header: "Customer ID", render: (row: any) => <span className="font-mono text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">{row.customerId?.customerId || '-'}</span> },
            { key: "customerId.name", header: "Name", render: (row: any) => <span className="font-medium whitespace-nowrap">{row.customerId?.name || '-'}</span> },
            { key: "customerId.phone", header: "Phone", render: (row: any) => <span className="font-mono text-sm whitespace-nowrap">{row.customerId?.phone || '-'}</span> },
            { key: "customerOrderId.engineerName", header: "Engineer Name", render: (row: any) => <span className="font-medium whitespace-nowrap">{row.customerOrderId?.engineerName || '-'}</span> },
            { key: "customerOrderId.actualVisitDate", header: "Visit Engineer Date", render: (row: any) => <span className="text-sm whitespace-nowrap">{formatDate(row.customerOrderId?.actualVisitDate)}</span> },
            { key: "customerOrderId.startDate", header: "Start Date", render: (row: any) => <span className="text-sm whitespace-nowrap">{formatDate(row.customerOrderId?.startDate)}</span> },
            { key: "customerOrderId.endDate", header: "End Date", render: (row: any) => <span className="text-sm whitespace-nowrap">{formatDate(row.customerOrderId?.endDate)}</span> },
            { key: "solvedIssue", header: "Solved Issue", render: (row: any) => <span>{row.solvedIssue ? <Badge variant={row.solvedIssue === 'Yes' ? 'default' : 'destructive'}>{row.solvedIssue}</Badge> : '-'}</span> },
            { key: "ratingOperation", header: "Rating Operation", render: (row: any) => <span className="text-sm font-medium">{row.ratingOperation || '-'}</span> },
            { key: "followUp", header: "Follow Up", render: (row: any) => <span className="text-sm">{row.followUp || '-'}</span> },
            { key: "ratingCustomerService", header: "Rating CS", render: (row: any) => <span className="text-sm font-medium">{row.ratingCustomerService || '-'}</span> },
            { key: "updatedBy.email", header: "User Email", render: (row: any) => <span className="text-sm text-[hsl(var(--muted-foreground))] whitespace-nowrap">{row.updatedBy?.email || '-'}</span> },
            { key: "notes", header: "Notes", render: (row: any) => <span className="text-sm max-w-[150px] truncate" title={row.notes}>{row.notes || '-'}</span> },
          ]}
          loading={loading}
          emptyMessage="No feedback found."
          page={page}
          totalPages={tp}
          totalItems={total}
          itemsPerPage={lim}
          onPageChange={setPage}
          renderActions={(row: any) => (
            <div className="flex items-center gap-2">
              <button onClick={() => openE(row as Feedback)} className="p-1 hover:bg-[hsl(var(--muted))] rounded transition-colors" title="Edit"><Edit2 className="h-4 w-4" /></button>
              <button onClick={() => setDelId((row as Feedback)._id)} className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          )}
          defaultVisibility={{
            detailedFeedback: false,
            notes: false,
          }}
        />
      </div>



      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">{editing ? 'Edit Feedback' : 'Log Feedback'}</h2><button onClick={() => setModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={save} className="space-y-4">
              {!editing && (
                <>
                  {/* Customer Dropdown */}
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Customer</label>
                    <select 
                      required
                      value={form.customerId} 
                      onChange={u('customerId')} 
                      className={iCls}
                    >
                      <option value="">Select Customer...</option>
                      {loadingLookups ? (
                        <option disabled>Loading...</option>
                      ) : customers.length === 0 ? (
                        <option disabled>No customers available</option>
                      ) : (
                        customers.map(c => (
                          <option key={c._id} value={c._id}>
                            {c.name} - {c.phone}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Customer Order Dropdown */}
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Customer Order (Optional)</label>
                    <select 
                      value={form.customerOrderId} 
                      onChange={u('customerOrderId')} 
                      className={iCls}
                    >
                      <option value="">Select Order...</option>
                      {loadingLookups ? (
                        <option disabled>Loading...</option>
                      ) : customerOrders.length === 0 ? (
                        <option disabled>No orders available</option>
                      ) : (
                        customerOrders.map(o => (
                          <option key={o._id} value={o._id}>
                            {(o.issue || 'Order').substring(0, 40)} - {o.customerId?.name || 'Customer'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </>
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Solved Issue</label>
                  <select value={form.solvedIssue} onChange={u('solvedIssue')} className={iCls}>
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Follow Up</label>
                  <select value={form.followUp} onChange={u('followUp')} className={iCls}>
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Rating Operation (Tech/Eng)</label>
                  <input placeholder="e.g., Excellent, Good, 5/5" value={form.ratingOperation} onChange={u('ratingOperation')} className={iCls} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Rating Customer Service</label>
                  <input placeholder="e.g., Excellent, Good, 5/5" value={form.ratingCustomerService} onChange={u('ratingCustomerService')} className={iCls} />
                </div>
              </div>
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
            <p className="mb-4 font-semibold">Delete this feedback?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
