'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { ClipboardList, Plus, X, TrendingUp, Phone, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import { createColumns, type FollowUp } from './columns';

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const blank = { workOrder: '', customer: '', csr: '', followUpDate: '', status: 'Pending', notes: '' };

export default function FollowUpPage() {
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [fSolved, setFSolved] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);

  // Dropdown data
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [csrUsers, setCsrUsers] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const lim = 10;

  // Fetch lookup data when modal opens
  useEffect(() => {
    if (modal) {
      setLoadingLookups(true);
      Promise.all([
        api.get('/operations/work-orders?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/shared/customers?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/hr/users?limit=1000').catch(() => ({ data: { data: [] } }))
      ])
        .then(([woRes, custRes, csrRes]) => {
          setWorkOrders(woRes.data?.data || []);
          setCustomers(custRes.data?.data || []);
          // Filter for CSR role users
          const csrs = (csrRes.data?.data || []).filter((u: any) => u.role === 'CustomerService');
          setCsrUsers(csrs);
        })
        .catch(() => {
          setWorkOrders([]);
          setCustomers([]);
          setCsrUsers([]);
        })
        .finally(() => setLoadingLookups(false));
    }
  }, [modal]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (statusFilter !== '') p.status = statusFilter;
      if (fSolved !== '') p.solvedIssue = fSolved;
      const { data } = await api.get('/customer/follow-up', { params: p });
      setRows(data.data?.data || []);
      setTotal(data.data?.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
      toast.error('Failed to load follow-ups');
      setRows([]);
    }
    setLoading(false);
  }, [page, statusFilter, fSolved]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Calculate insight stats
  const pendingCount = rows.filter(d => d.status === 'Pending').length;
  const contactedCount = rows.filter(d => d.status === 'Contacted').length;
  const completedCount = rows.filter(d => d.status === 'Completed').length;

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: FollowUp) => {
    setEditing(r);
    setForm({
      workOrder: r.workOrder?._id || '',
      customer: r.customer?._id || '',
      csr: r.csr?._id || '',
      followUpDate: r.followUpDate?.slice(0, 10) || '',
      status: r.status || 'Pending',
      notes: r.notes || ''
    });
    setError('');
    setModal(true);
  };

  // Handle WorkOrder selection and auto-fill customer
  const handleWorkOrderChange = (workOrderId: string) => {
    const wo = workOrders.find(w => w._id === workOrderId);
    setForm(prev => ({
      ...prev,
      workOrder: workOrderId,
      // Auto-fill customer from workOrder if not already set
      customer: prev.customer || (wo?.customerOrderId?.customerId?._id || '')
    }));
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== '') pl[k] = v;
    }
    try {
      if (editing) await api.put(`/customer/follow-up/${editing._id}`, pl);
      else await api.post('/customer/follow-up', pl);
      setModal(false);
      fetch_();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed');
    }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    try {
      await api.delete(`/customer/follow-up/${delId}`);
      fetch_();
    } catch { }
    setDelId(null);
  };

  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  // Quick action: Update status
  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await api.put(`/customer/follow-up/${id}`, { status: newStatus });
      fetch_();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Create columns with handlers
  const columns = createColumns(handleStatusUpdate, openE, setDelId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-[hsl(var(--primary))]" />
          <h1 className="text-2xl font-bold">Follow Ups</h1>
        </div>
        <button
          onClick={openC}
          className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Follow Up
        </button>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-200 dark:bg-amber-800">
              <TrendingUp className="h-6 w-6 text-amber-700 dark:text-amber-200" />
            </div>
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-200 font-medium">Pending</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-200 dark:bg-blue-800">
              <Phone className="h-6 w-6 text-blue-700 dark:text-blue-200" />
            </div>
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-200 font-medium">Contacted</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{contactedCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-200 dark:bg-green-800">
              <CheckCircle className="h-6 w-6 text-green-700 dark:text-green-200" />
            </div>
            <div>
              <p className="text-sm text-green-700 dark:text-green-200 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{completedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Contacted">Contacted</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Canceled">Canceled</option>
        </select>

        <select
          value={fSolved}
          onChange={e => { setFSolved(e.target.value); setPage(1); }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
        >
          <option value="">All Solved Issues (Yes/No)</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns as any}
        data={rows as any}
        loading={loading}
        page={page}
        totalPages={Math.ceil(total / lim)}
        totalItems={total}
        itemsPerPage={lim}
        onPageChange={setPage}
        defaultVisibility={{
          issue: false,
          visitSite: false,
          engineerName: false,
          visitDate: false,
          startDate: false,
          endDate: false,
          deviceReturnedDate: false,
          punctuality: false,
          lateDifference: false,
          reasonForDelay: false,
          userEmail: false,
          notes: false,
        }}
      />

      {/* Edit/Create Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{editing ? 'Edit Follow Up' : 'New Follow Up'}</h2>
              <button onClick={() => setModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              {/* Work Order Dropdown */}
              {!editing && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Work Order (Optional)</label>
                  <select 
                    value={form.workOrder} 
                    onChange={(e) => handleWorkOrderChange(e.target.value)} 
                    className={iCls}
                  >
                    <option value="">Select Work Order...</option>
                    {loadingLookups ? (
                      <option disabled>Loading...</option>
                    ) : workOrders.length === 0 ? (
                      <option disabled>No work orders available</option>
                    ) : (
                      workOrders.map(wo => (
                        <option key={wo._id} value={wo._id}>
                          {wo.maintenanceEngineer || 'Engineer'} - {(wo.customerOrderId?.issue || '').substring(0, 40)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Customer Dropdown */}
              {!editing && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Customer</label>
                  <select 
                    required
                    value={form.customer} 
                    onChange={u('customer')} 
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
              )}

              {/* CSR Dropdown */}
              {!editing && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">CSR (Optional)</label>
                  <select 
                    value={form.csr} 
                    onChange={u('csr')} 
                    className={iCls}
                  >
                    <option value="">Select CSR...</option>
                    {loadingLookups ? (
                      <option disabled>Loading...</option>
                    ) : csrUsers.length === 0 ? (
                      <option disabled>No CSR users available</option>
                    ) : (
                      csrUsers.map(u => (
                        <option key={u._id} value={u._id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <input type="date" value={form.followUpDate} onChange={u('followUpDate')} className={iCls} />
              <select value={form.status} onChange={u('status')} className={iCls}>
                <option value="Pending">Pending</option>
                <option value="Contacted">Contacted</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Canceled">Canceled</option>
              </select>
              <textarea placeholder="Notes" value={form.notes} onChange={u('notes')} className={iCls} rows={3} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <p className="mb-4 font-semibold">Delete this follow-up?</p>
            <div className="flex gap-3">
              <button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">
                Delete
              </button>
              <button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
