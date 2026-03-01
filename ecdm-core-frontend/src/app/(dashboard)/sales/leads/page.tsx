'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Users, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';

interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  type: string;
  sector: string;
  email?: string;
  company?: string;
  address?: string;
  region?: string;
}

interface SalesLead {
  _id: string;
  customerId: Customer;
  issue: string;
  order: string;
  reason: string;
  salesPerson: string;
  status: 'New' | 'Contacted' | 'Negotiation' | 'Closed';
  typeOfOrder: string;
  salesPlatform: string;
  date: string;
  notes: string;
}

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const STATUSES = ['New', 'Contacted', 'Negotiation', 'Closed'] as const;
const ORDER_OPTIONS = ['', 'Yes', 'No'] as const;
const TYPE_OF_ORDER = ['Maintenance', 'General supplies', 'Supply and installation'];
const SALES_PLATFORM = ['Online', 'In Side', 'Phone', 'Out side', 'Data'];
type OrderOption = typeof ORDER_OPTIONS[number];

// Status Badge Component with visual differentiation
const StatusBadge = ({ status }: { status: SalesLead['status'] }) => {
  const styles: Record<string, string> = {
    New:         'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
    Contacted:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    Negotiation: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
    Closed:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
  };
  const isNew = status === 'New';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.New}`}>
      {isNew && <AlertCircle className="h-3 w-3" />}
      {status}
    </span>
  );
};

const blankEdit: { issue: string; order: OrderOption; reason: string; notes: string; status: 'New' | 'Contacted' | 'Negotiation' | 'Closed'; address: string; region: string; typeOfOrder: string; salesPlatform: string } = { issue: '', order: '', reason: '', notes: '', status: 'New', address: '', region: '', typeOfOrder: '', salesPlatform: '' };

export default function SalesLeadsPage() {
  const [rows, setRows] = useState<SalesLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fStatus, setFStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SalesLead | null>(null);
  const [form, setForm] = useState(blankEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10;
  const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fStatus) p.status = fStatus;
      const { data } = await api.get('/sales/leads', { params: p });
      setRows(data.data.data);
      setTotal(data.data.pagination.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, fStatus]);
  
  useEffect(() => { fetch_(); }, [fetch_]);

  const openE = (r: SalesLead) => {
    setEditing(r);
    // Normalize order value to Yes/No/empty for the select field
    const normalizedOrder: OrderOption = r.order === 'Yes' ? 'Yes' : r.order === 'No' ? 'No' : '';
    setForm({
      issue: r.issue || '',
      order: normalizedOrder,
      reason: r.reason || '',
      notes: r.notes || '',
      status: r.status || 'New',
      address: r.customerId?.address || '',  // Initialize from populated Customer
      region: r.customerId?.region || '',    // Initialize from populated Customer
      typeOfOrder: r.typeOfOrder || '',
      salesPlatform: r.salesPlatform || '',
    });
    setError('');
    setModal(true);
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
      // Use PATCH to auto-track salesPerson from logged-in user
      await api.patch(`/sales/leads/${editing!._id}`, pl);
      setModal(false);
      toast.success('Lead updated successfully');
      fetch_();
    } catch (e: unknown) {
      const errorMessage = (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update lead';
      setError(errorMessage);
      // Show toast for order-related errors (when trying to revert to No after action taken)
      if (errorMessage.includes('Action already taken') || errorMessage.includes('Cannot revert')) {
        toast.error('Cannot cancel: Action has already been taken on this Sales Order');
      } else {
        toast.error(errorMessage);
      }
    }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    try { await api.delete(`/sales/leads/${delId}`); fetch_(); } catch { /* ignore */ }
    setDelId(null);
  };

  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const formatDate = (d: string) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch { return '-'; }
  };

  // ─── Column Definitions for DataTable ─────────────────────────────────────────
  const columns = [
    {
      key: 'customerId.customerId',
      header: 'ID',
      render: (row: SalesLead) => (
        <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
          {row.customerId?.customerId || '-'}
        </span>
      ),
    },
    {
      key: 'customerId.name',
      header: 'Name',
      render: (row: SalesLead) => (
        <span className="font-medium">{row.customerId?.name || '-'}</span>
      ),
    },
    {
      key: 'customerId.phone',
      header: 'Phone',
      render: (row: SalesLead) => row.customerId?.phone || '-',
    },
    {
      key: 'customerId.type',
      header: 'Type',
      render: (row: SalesLead) => row.customerId?.type || '-',
    },
    {
      key: 'customerId.sector',
      header: 'Sector',
      render: (row: SalesLead) => row.customerId?.sector || '-',
    },
    {
      key: 'customerId.address',
      header: 'Address',
      render: (row: SalesLead) => (
        <span className="max-w-[150px] truncate block" title={row.customerId?.address}>
          {row.customerId?.address || '-'}
        </span>
      ),
    },
    {
      key: 'customerId.region',
      header: 'Region',
      render: (row: SalesLead) => row.customerId?.region || '-',
    },
    {
      key: 'issue',
      header: 'Issue',
      render: (row: SalesLead) => (
        <span className="max-w-[120px] truncate block" title={row.issue}>
          {row.issue || '-'}
        </span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      render: (row: SalesLead) => {
        if (!row.order) return '-';
        const color = row.order === 'Yes' ? 'text-green-600 font-semibold' : 'text-gray-600';
        return <span className={color}>{row.order}</span>;
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row: SalesLead) => (
        <span className="max-w-[100px] truncate block" title={row.reason}>
          {row.reason || '-'}
        </span>
      ),
    },
    {
      key: 'salesPerson',
      header: 'SalesPerson',
      render: (row: SalesLead) => (
        <span className="text-xs">{row.salesPerson || <span className="text-[hsl(var(--muted-foreground))]">—</span>}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row: SalesLead) => <span className="text-xs">{formatDate(row.date)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: SalesLead) => <StatusBadge status={row.status} />,
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (row: SalesLead) => (
        <span className="max-w-[100px] truncate block" title={row.notes}>
          {row.notes || '-'}
        </span>
      ),
    },
  ];

  // ─── Row Actions ──────────────────────────────────────────────────────────────
  const renderActions = (row: SalesLead) => (
    <div className="flex gap-2">
      <button 
        onClick={() => openE(row)} 
        className="p-1 hover:text-[hsl(var(--primary))]" 
        title="Edit"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button 
        onClick={() => setDelId(row._id)} 
        className="p-1 hover:text-destructive" 
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  const COLUMNS = ['ID', 'Name', 'Phone', 'Type', 'Sector', 'Issue', 'Order', 'Reason', 'SalesPerson', 'Date', 'Status', 'Notes', 'Actions'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-[hsl(var(--primary))]" />
          <h1 className="text-2xl font-bold">Sales Leads</h1>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={fStatus}
          onChange={e => { setFStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* DataTable with RBAC-Protected Bulk Delete */}
      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        emptyMessage="No leads found. Leads are auto-forwarded from Marketing."
        page={page}
        totalPages={tp}
        onPageChange={setPage}
        bulkDeleteEndpoint="/sales/leads/bulk-delete"
        onBulkDeleteSuccess={fetch_}
        renderActions={renderActions}
      />

      {/* Edit Modal - Only allows editing of issue, order, reason, notes */}
      {modal && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">Update Lead</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{editing.customerId?.customerId} • {editing.customerId?.name || '-'}</p>
              </div>
              <button onClick={() => setModal(false)}><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={save} className="space-y-4">
              {/* Read-only info */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[hsl(var(--muted))]/30 text-sm">
                <div><span className="text-[hsl(var(--muted-foreground))]">Phone:</span> {editing.customerId?.phone || '-'}</div>
                <div><span className="text-[hsl(var(--muted-foreground))]">Type:</span> {editing.customerId?.type || '-'}</div>
                <div><span className="text-[hsl(var(--muted-foreground))]">Sector:</span> {editing.customerId?.sector || '-'}</div>
                <div><span className="text-[hsl(var(--muted-foreground))]">Sales Person:</span> {editing.salesPerson || <em>Auto-assigned</em>}</div>
              </div>

              {/* Customer Fields (SSOT) - Editable */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Address</label>
                  <input placeholder="Customer address..." value={form.address} onChange={u('address')} className={iCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Region</label>
                  <input placeholder="Region/City..." value={form.region} onChange={u('region')} className={iCls} />
                </div>
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Type Of Order</label>
                  <select value={form.typeOfOrder} onChange={u('typeOfOrder')} className={iCls}>
                    <option value="">Select...</option>
                    {TYPE_OF_ORDER.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Sales Platform</label>
                  <select value={form.salesPlatform} onChange={u('salesPlatform')} className={iCls}>
                    <option value="">Select...</option>
                    {SALES_PLATFORM.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Issue / Description</label>
                <textarea placeholder="Describe the customer's issue or inquiry..." value={form.issue} onChange={u('issue')} rows={2} className={iCls} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Order</label>
                <div className="flex gap-2">
                  {/* Yes/No Radio Group styled as buttons */}
                  <label className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium cursor-pointer transition-all ${
                    form.order === 'Yes' 
                      ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400' 
                      : 'border-[hsl(var(--border))] hover:border-green-500/50'
                  }`}>
                    <input
                      type="radio"
                      name="order"
                      value="Yes"
                      checked={form.order === 'Yes'}
                      onChange={() => setForm(p => ({ ...p, order: 'Yes' }))}
                      className="sr-only"
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium cursor-pointer transition-all ${
                    form.order === 'No' 
                      ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400' 
                      : 'border-[hsl(var(--border))] hover:border-red-500/50'
                  }`}>
                    <input
                      type="radio"
                      name="order"
                      value="No"
                      checked={form.order === 'No'}
                      onChange={() => setForm(p => ({ ...p, order: 'No' }))}
                      className="sr-only"
                    />
                    <span>No</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Selecting &quot;Yes&quot; will create a Sales Order. Changing to &quot;No&quot; is only possible if no action has been taken on the order.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Reason / Outcome</label>
                <input placeholder="Reason for status change or outcome..." value={form.reason} onChange={u('reason')} className={iCls} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Status</label>
                <select value={form.status} onChange={u('status')} className={iCls}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Notes</label>
                <textarea placeholder="Additional notes..." value={form.notes} onChange={u('notes')} rows={2} className={iCls} />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Changes'}
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
            <p className="mb-4 font-semibold">Delete this lead?</p>
            <div className="flex gap-3">
              <button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button>
              <button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
