'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { ClipboardList, TrendingUp, Phone, CheckCircle, Eye } from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuth';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createColumns, type FollowUp } from './columns';
import EditFollowUpDialog from './EditFollowUpDialog';
import EditFeedbackDialog from '../feedback/EditFeedbackDialog';

interface OrderContext {
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  engineerName?: string;
  visitDate?: string;
  scheduledVisitDate?: string;
  actualVisitDate?: string;
  startDate?: string;
  endDate?: string;
  dealStatus?: string;
  orderId?: string;
}

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const blank = { workOrder: '', customer: '', csr: '', customerOrderId: '', followUpDate: '', status: 'Pending', notes: '' };

export default function FollowUpPage() {
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [fSolved, setFSolved] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);

  // Feedback prefill data
  const [feedbackPrefill, setFeedbackPrefill] = useState<{
    customerId: string;
    customerOrderId: string;
    orderContext: OrderContext;
  } | null>(null);

  // Dropdown data
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [csrUsers, setCsrUsers] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const lim = 10;

  // Fetch lookup data when modal opens
  useEffect(() => {
    if (modal) {
      setLoadingLookups(true);
      Promise.all([
        api.get('/operations/work-orders?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/shared/customers?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/hr/users?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/customer/orders?limit=1000').catch(() => ({ data: { data: [] } }))
      ])
        .then(([woRes, custRes, csrRes, ordersRes]) => {
          setWorkOrders(woRes.data?.data || []);
          setCustomers(custRes.data?.data || []);
          const csrs = (csrRes.data?.data || []).filter((u: any) => u.role === 'CustomerService');
          setCsrUsers(csrs);
          setCustomerOrders(ordersRes.data?.data || []);
        })
        .catch(() => {
          setWorkOrders([]);
          setCustomers([]);
          setCsrUsers([]);
          setCustomerOrders([]);
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
      const response = await api.get('/customer/follow-up', { params: p });

      const rawData = response.data?.data?.data ?? response.data?.data ?? response.data ?? [];
      const followUpArray = Array.isArray(rawData) ? rawData : [];
      setRows(followUpArray);

      const pagination = response.data?.data?.pagination ?? response.data?.pagination ?? null;
      setTotal(pagination?.total ?? 0);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
      toast.error('Failed to load follow-ups');
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  }, [page, statusFilter, fSolved]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'SuperAdmin' || user?.role === 'Admin' || user?.role === 'Manager';
  const isCS = user?.role === 'Customer Service' || user?.role === 'CustomerService';

  const canEdit = useCallback((row: FollowUp) => {
    if (isAdminOrManager) return true;
    if (isCS) {
      if (!row.csPerson) return true; // Unlocked
      if (row.csPerson === user?.email) return true; // Owner
    }
    return false;
  }, [isAdminOrManager, isCS, user?.email]);

  const pendingCount = rows.filter(d => d.status === 'Pending').length;
  const contactedCount = rows.filter(d => d.status === 'Contacted').length;
  const completedCount = rows.filter(d => d.status === 'Completed').length;

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: FollowUp, allowed: boolean = true) => {
    setEditing(r);
    setForm({
      workOrder: r.workOrder?._id || '',
      customer: r.customer?._id || '',
      csr: r.csr?._id || '',
      customerOrderId: (r.customerOrderId as any)?._id || (r.customerOrderId as any)?.orderId || '',
      followUpDate: r.followUpDate?.slice(0, 10) || '',
      status: r.status || 'Pending',
      notes: r.notes || ''
    });
    setError('');
    setModal(true);
  };

  const handleWorkOrderChange = (workOrderId: string) => {
    const wo = workOrders.find(w => w._id === workOrderId);
    setForm(prev => ({
      ...prev,
      workOrder: workOrderId,
      customer: prev.customer || (wo?.customerOrderId?.customerId?._id || '')
    }));
  };

  const handleCustomerOrderChange = (orderId: string) => {
    const order = customerOrders.find(o => o._id === orderId);
    setForm(prev => ({
      ...prev,
      customerOrderId: orderId,
      customer: prev.customer || (order?.customerId?._id || '')
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
      const error = e as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed');
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

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await api.put(`/customer/follow-up/${id}`, { status: newStatus });
      fetch_();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleOpenFeedback = (orderContext: OrderContext, customerOrderId: string, customerId: string) => {
    setFeedbackPrefill({
      customerId,
      customerOrderId,
      orderContext
    });
    setFeedbackModal(true);
  };

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const columns = createColumns(handleStatusUpdate, (r, allowed = true) => openE(r, allowed), setDelId, canEdit, isAdmin);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader 
        title="Follow Ups"
        icon={ClipboardList}
        actions={
          <button
            onClick={openC}
            className="flex items-center justify-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 border-0"
          >
            + Add Follow Up
          </button>
        }
      />

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

      <div className="flex gap-3 flex-wrap animate-in-slide stagger-2">
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

      <DataTable
        columns={columns as any}
        data={rows as any}
        loading={loading}
        page={page}
        totalPages={Math.ceil(total / lim)}
        totalItems={total}
        itemsPerPage={lim}
        onPageChange={setPage}
        onRowClick={(r) => openE(r as FollowUp, canEdit(r as FollowUp))}
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

      {/* Create Form Modal */}
      <Dialog open={modal && !editing} onOpenChange={(open) => !open && setModal(false)}>
        <DialogContent className="p-6 outline-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create Follow Up</DialogTitle>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1.5 block">Customer Order (Context)</label>
                <select
                  value={form.customerOrderId}
                  onChange={e => handleCustomerOrderChange(e.target.value)}
                  className={iCls}
                  disabled={loadingLookups}
                >
                  <option value="">Select Order (Optional)</option>
                  {customerOrders.map(o => (
                    <option key={o._id} value={o._id}>
                      {o.customerId?.name || 'Order'} - {o.engineerName || 'No Engineer'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1.5 block">Customer</label>
                <select
                  value={form.customer}
                  onChange={u('customer')}
                  className={iCls}
                  disabled={loadingLookups}
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1.5 block">CSR</label>
                <select value={form.csr} onChange={u('csr')} className={iCls} disabled={loadingLookups}>
                  <option value="">Select CSR</option>
                  {csrUsers.map(u => (
                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1.5 block">Follow Up Date</label>
                <input type="date" value={form.followUpDate} onChange={u('followUpDate')} className={iCls} />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1.5 block">Status</label>
                <select value={form.status} onChange={u('status')} className={iCls}>
                  <option value="Pending">Pending</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1.5 block">Notes</label>
              <textarea value={form.notes} onChange={u('notes')} rows={3} className={iCls} placeholder="Enter notes..." />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
              <button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-60">
                {saving ? 'Saving...' : 'Create Follow Up'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {modal && editing && (
        <EditFollowUpDialog
          followUp={editing}
          readOnly={!canEdit(editing)}
          onClose={() => setModal(false)}
          onSuccess={fetch_}
          onOpenFeedback={handleOpenFeedback}
        />
      )}

      {/* Feedback Dialog */}
      {feedbackModal && feedbackPrefill && (
        <EditFeedbackDialog
          isNew={true}
          prefillData={feedbackPrefill}
          onClose={() => { setFeedbackModal(false); setFeedbackPrefill(null); }}
          onSuccess={() => { setFeedbackModal(false); setFeedbackPrefill(null); fetch_(); }}
        />
      )}

      <Dialog open={!!delId} onOpenChange={(open) => !open && setDelId(null)}>
        <DialogContent className="p-6 outline-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete Follow Up</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[hsl(var(--muted-foreground))] mb-6 text-left">
              Are you sure you want to delete this follow-up records? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={del} 
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 focus-visible:outline-none"
              >
                Delete
              </button>
              <button 
                onClick={() => setDelId(null)} 
                className="flex-1 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-3 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


