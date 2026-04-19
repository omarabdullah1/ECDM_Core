'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Users, Edit2, Trash2, X, AlertCircle, Eye } from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuth';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditLeadDialog } from './EditLeadDialog';

export interface Customer {
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

export interface SalesLead {
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

export const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
export const STATUSES = ['New', 'Contacted', 'Negotiation', 'Closed'] as const;
export const ORDER_OPTIONS = ['', 'Yes', 'No'] as const;
export const TYPE_OF_ORDER = ['Maintenance', 'General supplies', 'Supply and installation'];
export const SALES_PLATFORM = ['Online', 'In Side', 'Phone', 'Out side', 'Data'];
export type OrderOption = typeof ORDER_OPTIONS[number];

// Status Badge Component with visual differentiation
const StatusBadge = ({ status }: { status: SalesLead['status'] }) => {
  const styles: Record<string, string> = {
    New: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
    Contacted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    Negotiation: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
    Closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
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
  const { user } = useAuthStore();
  const [rows, setRows] = useState<SalesLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fStatus, setFStatus] = useState('');
  const [fOrder, setFOrder] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SalesLead | null>(null);
  const [form, setForm] = useState(blankEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const [showApprovalAlert, setShowApprovalAlert] = useState(false);
  const lim = 1000;
  const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fStatus) p.status = fStatus;
      if (fOrder) p.order = fOrder;
      const { data } = await api.get('/sales/leads', { params: p });
      setRows(data.data.data || []);
      setTotal(data.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch sales leads:', err);
      toast.error('Failed to load sales leads');
      setRows([]);
    }
    setLoading(false);
  }, [page, fStatus, fOrder]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const openE = (r: SalesLead) => {
    setEditing(r);
    
    // Ownership & RBAC Check
    const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
    const isOwner = r.salesPerson && user && (
      user.email === r.salesPerson || 
      `${user.firstName} ${user.lastName}`.trim() === r.salesPerson
    );
    
    // We only open the dialog. The isReadOnly prop passed to EditLeadDialog 
    // will handle the actual locking of fields.
    
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
      const response = await api.patch(`/sales/leads/${editing!._id}`, pl);

      // ─────────────────────────────────────────────────────────────────────────
      // DEBUG: Log response details
      // ─────────────────────────────────────────────────────────────────────────
      console.log('🔍 API Response Status:', response.status);
      console.log('🔍 API Response Data:', response.data);

      // ─────────────────────────────────────────────────────────────────────────
      // Handle Maker-Checker 202 Accepted Status
      // ─────────────────────────────────────────────────────────────────────────
      if (response.status === 202) {
        console.log('⏳ Edit intercepted by Maker-Checker - Pending approval');
        console.log('🔔 Setting showApprovalAlert to TRUE');
        setSaving(false); // Reset saving state
        setShowApprovalAlert(true);
        return; // CRITICAL: Exit here - DO NOT call setModal(false)
      }

      // ─────────────────────────────────────────────────────────────────────────
      // Standard Success (200/204) - Admin or no Maker-Checker
      // ─────────────────────────────────────────────────────────────────────────
      console.log('✅ Lead updated successfully (Status:', response.status, ')');
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
    try { 
      await api.delete(`/sales/leads/${delId}`); 
      toast.success('Lead deleted successfully');
      fetch_(); 
    } catch (err) {
      console.error('Failed to delete lead:', err);
      toast.error('Failed to delete lead');
    }
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
        <div className="max-w-[150px] truncate text-sm" title={row.customerId?.address}>
          {row.customerId?.address || '-'}
        </div>
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
        <div className="max-w-[150px] truncate font-medium" title={row.issue}>
          {row.issue || '-'}
        </div>
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
        <div className="max-w-[150px] truncate font-medium" title={row.reason}>
          {row.reason || '-'}
        </div>
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
        <div className="max-w-[120px] truncate text-gray-500" title={row.notes}>
          {row.notes || '-'}
        </div>
      ),
    },
  ];

  // ─── Row Actions ──────────────────────────────────────────────────────────────
  const renderActions = (row: SalesLead) => {
    const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
    const isOwner = row.salesPerson && user && (
      user.email === row.salesPerson || 
      `${user.firstName} ${user.lastName}`.trim() === row.salesPerson
    );
    const canEdit = isAdmin || !row.salesPerson || isOwner;

    return (
      <div className="flex gap-2">
        <button
          onClick={() => openE(row)}
          className={`p-1 transition-colors ${canEdit ? 'hover:text-[hsl(var(--primary))]' : 'hover:text-blue-500'}`}
          title={canEdit ? "Edit" : "Preview"}
        >
          {canEdit ? <Edit2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {isAdmin && (
          <button
            onClick={() => setDelId(row._id)}
            className="p-1 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  const COLUMNS = ['ID', 'Name', 'Phone', 'Type', 'Sector', 'Issue', 'Order', 'Reason', 'SalesPerson', 'Date', 'Status', 'Notes', 'Actions'];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <PageHeader 
        title="Sales Leads"
        icon={Users}
      />

      {/* Filter */}
      <div className="flex gap-3 flex-wrap animate-in-slide stagger-2">
        <select
          value={fStatus}
          onChange={e => { setFStatus(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={fOrder}
          onChange={e => { setFOrder(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10"
        >
          <option value="">All Orders (Yes/No)</option>
          {ORDER_OPTIONS.filter(o => o !== '').map(o => <option key={o} value={o}>{o}</option>)}
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
        totalItems={total}
        itemsPerPage={lim}
        onPageChange={setPage}
        bulkDeleteEndpoint="/sales/leads/bulk-delete"
        onBulkDeleteSuccess={fetch_}
        onRowClick={openE}
        renderActions={renderActions}
        defaultVisibility={{
          "customerId.address": false,
          "customerId.region": false,
          "customerId.sector": false,
          date: false,
          notes: false,
          reason: false,
        }}
      />

      {/* Edit Modal Custom implementation extracted */}
      <EditLeadDialog
        isOpen={modal}
        onClose={() => setModal(false)}
        onSuccess={fetch_}
        lead={editing}
        isReadOnly={
          !!editing?.salesPerson && 
          !(user?.role === 'Admin' || user?.role === 'SuperAdmin') && 
          !(user && (user.email === editing.salesPerson || `${user.firstName} ${user.lastName}`.trim() === editing.salesPerson))
        }
        onRequiresApproval={() => {
          setModal(false);
          setShowApprovalAlert(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      {delId && (
        <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in transition-all">
          <div className="rounded-md border border-[hsl(var(--border))]/50 modern-glass-card premium-shadow animate-in-slide m-auto relative p-6 shadow-lg sm:max-w-md w-full">
            <p className="mb-4 font-semibold">Delete this lead?</p>
            <div className="flex gap-3">
              <button onClick={del} className="flex-1 rounded-md bg-[hsl(var(--destructive))] py-2 text-sm font-medium text-[hsl(var(--destructive-foreground))] shadow-sm transition-all hover:opacity-90 focus-visible:outline-none">Delete</button>
              <button onClick={() => setDelId(null)} className="flex-1 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-2 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          Maker-Checker Approval Alert Dialog
          Shown when status 202 is returned (non-admin edit pending approval)
      ═══════════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={showApprovalAlert} onOpenChange={setShowApprovalAlert}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Approval Required</AlertDialogTitle>
            <AlertDialogDescription>
              Your modifications have been submitted successfully. However, they require Admin approval before taking effect on the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                console.log('✅ User acknowledged approval requirement');
                setShowApprovalAlert(false);
                setModal(false); // Close the edit modal
                fetch_(); // Refresh the data table
              }}
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
