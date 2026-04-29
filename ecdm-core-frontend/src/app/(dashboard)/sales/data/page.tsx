'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { FileText, Plus, Edit2, Trash2, X, Download, Upload, History, Lock, UserPlus } from 'lucide-react';
import { downloadSalesDataTemplate } from '@/lib/excelTemplate';
import ImportDataDialog from '@/components/sales/ImportDataDialog';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { createSalesDataColumns, SalesData } from './columns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/useAuth';

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const OUTCOMES = ['Pending', 'No Answer', 'Interested', 'Converted', 'Rejected'];
const TYPE_OF_ORDER = ['Maintenance', 'General supplies', 'Supply and installation'];
const SALES_PLATFORM = ['Online', 'In Side', 'Phone', 'Out side', 'Data'];
const SECTORS = ['B2C', 'B2B', 'B2G', 'Hybrid', 'Other'];

const blank = {
  marketingData: '',
  salesPerson: '',
  customer: '',
  // New Customer Fields
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  customerRegion: '',
  customerSector: '',
  
  callDate: '',
  callOutcome: 'Pending',
  typeOfOrder: '',
  salesPlatform: '',
  issue: '',
  order: '',
  followUp: '',
  followUpDate: '',
  notes: ''
};

export default function SalesDataPage() {
  const [rows, setRows] = useState<SalesData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fOutcome, setFOutcome] = useState('');
  const [fTypeOfOrder, setFTypeOfOrder] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SalesData | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const { user: currentUser } = useAuthStore();
  const lim = 10;
  const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fOutcome) p.callOutcome = fOutcome;
      if (fTypeOfOrder) p.typeOfOrder = fTypeOfOrder;
      const { data } = await api.get('/sales/data', { params: p });
      setRows(data.data.data);
      setTotal(data.data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch sales data:', err);
      toast.error('Failed to load sales data');
    }
    setLoading(false);
  }, [page, fOutcome, fTypeOfOrder]);

  useEffect(() => { fetch_(); }, [fetch_]);

   const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setError('');
    setIsReadOnly(false);
    setModal(true);
  };

  const openEdit = (row: SalesData, readOnly = false) => {
    // Permission check: Only owner, admin, or if record is unassigned
    const isOwner = row.salesPerson?._id === currentUser?._id;
    const isAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Manager';
    const isUnassigned = !row.salesPerson;
    const canEdit = isUnassigned || isOwner || isAdmin;

    setEditing(row);
    setIsReadOnly(!canEdit || readOnly);
    setForm({
      ...blank,
      marketingData: row.marketingData?._id || '',
      salesPerson: row.salesPerson?._id || '',
      customer: (row.customer?._id || row.customerId?._id) || '',
      callDate: row.callDate ? new Date(row.callDate).toISOString().slice(0, 16) : '',
      callOutcome: row.callOutcome || 'Pending',
      typeOfOrder: row.typeOfOrder || '',
      salesPlatform: row.salesPlatform || '',
      issue: row.issue || '',
      order: row.order || '',
      followUp: row.followUp || '',
      followUpDate: row.followUpDate ? new Date(row.followUpDate).toISOString().slice(0, 16) : '',
      notes: row.notes || '',
    });
    setError('');
    setModal(true);
  };

  const handleDelete = (row: SalesData) => {
    setDelId(row._id);
  };

  const handleHistory = (row: SalesData) => {
    toast.success(`History for ${row._id} - Feature coming soon!`);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setError('');

    const pl: Record<string, unknown> = {};
    
    // Exclude immutable reference IDs
    // A record's owner (salesPerson) is immutable once set.
    const immutableFields = (editing && editing.salesPerson) ? ['marketingData', 'salesPerson', 'customer'] : ['marketingData', 'customer'];

    for (const [k, v] of Object.entries(form)) {
      if (v !== '' && !immutableFields.includes(k)) {
        pl[k] = v;
      }
    }

    // Auto-assign logic:
    // 1. If editing an unassigned record, current user becomes the owner.
    if (editing && !editing.salesPerson && currentUser?._id) {
      pl.salesPerson = currentUser._id;
    }
    // 2. If creating a new record and no salesperson is specified, use current user.
    if (!editing && !pl.salesPerson && currentUser?._id) {
      pl.salesPerson = currentUser._id;
    }

    try {
      if (editing) {
        await api.put(`/sales/data/${editing._id}`, pl);
        toast.success('Sales data updated successfully');
      } else {
        await api.post('/sales/data', pl);
        toast.success('Sales data created successfully');
      }
      setModal(false);
      fetch_();
    } catch (e: unknown) {
      const errorMsg = (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save';
      setError(errorMsg);
      toast.error(errorMsg);
    }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    try {
      await api.delete(`/sales/data/${delId}`);
      toast.success('Sales data deleted successfully');
      fetch_();
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete sales data');
    }
    setDelId(null);
  };

  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  // Create columns with action handlers
   const columns = createSalesDataColumns({
    onEdit: (row) => openEdit(row, false),
    onDelete: handleDelete,
    onHistory: handleHistory,
    currentUser,
  });

  return (
    <div className="space-y-6 pb-8">
      <PageHeader 
        title="Sales Data"
        icon={FileText}
        actions={
          <>
            <button
              onClick={() => downloadSalesDataTemplate()}
              className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
            <button
              onClick={() => setImportDialogOpen(true)}
              className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"
            >
              <Upload className="h-4 w-4" />
              Import Excel
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 border-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </>
        }
      />

      <div className="flex gap-3 flex-wrap items-center">
        <select value={fOutcome} onChange={e => { setFOutcome(e.target.value); setPage(1); }} className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10">
          <option value="">All Outcomes</option>
          {OUTCOMES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fTypeOfOrder} onChange={e => { setFTypeOfOrder(e.target.value); setPage(1); }} className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10">
          <option value="">All Order Types</option>
          {TYPE_OF_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="w-full">
        <DataTable
          data={rows}
          columns={columns}
          loading={loading}
          emptyMessage="No sales data found."
          page={page}
          totalPages={tp}
          totalItems={total}
          itemsPerPage={lim}
          onPageChange={setPage}
          bulkDeleteEndpoint="/sales/data/bulk-delete"
          onBulkDeleteSuccess={fetch_}
          onRowClick={(row) => openEdit(row, true)}
          defaultVisibility={{
            "customer.address": false,
            "customer.region": false,
            "customer.sector": false,
            callDate: false,
            issue: false,
            salesPerson: false,
            followUp: false,
            followUpDate: false,
            salesPlatform: false,
            notes: false,
            "customer.customerId": true,
          }}
        />
      </div >

      {/* Create/Edit Modal */}
      {modal && (
        <Dialog open={modal} onOpenChange={(open) => !open && setModal(false)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? (isReadOnly ? 'Sales Data Preview' : 'Edit Sales Data') : 'Add Sales Data'}
              </DialogTitle>
            </DialogHeader>

            <DialogBody>
              <form id="sales-data-form" onSubmit={save} className="space-y-4">
                {/* Read-only Context Information */}
                {editing && (
                  <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-[hsl(var(--muted))]/30">
                    <div>
                      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Customer Name</label>
                      <input
                        value={editing.customer?.name || editing.customerId?.name || 'Unknown Customer'}
                        disabled
                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Sales Person Email</label>
                      <input
                        value={editing.salesPerson?.email || 'Unassigned'}
                        disabled
                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] cursor-not-allowed"
                      />
                    </div>
                    {editing.marketingData && (
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Marketing Data Source</label>
                        <input
                          value={`${editing.marketingData.name || 'N/A'} - ${editing.marketingData.phone || 'N/A'} (${editing.marketingData.dataSource || 'Unknown'})`}
                          disabled
                          className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] cursor-not-allowed"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Editable fields only shown when creating new record */}
                {!editing && (
                  <div className="space-y-4 border-b pb-4 mb-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--primary))]">
                      <UserPlus className="h-4 w-4" />
                      <span>Customer Details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Customer Name *</label>
                        <input
                          required
                          placeholder="Full Name"
                          value={form.customerName}
                          onChange={u('customerName')}
                          className={iCls}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Customer Phone *</label>
                        <input
                          required
                          placeholder="Phone Number"
                          value={form.customerPhone}
                          onChange={u('customerPhone')}
                          className={iCls}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Address</label>
                        <input
                          placeholder="Street, Building"
                          value={form.customerAddress}
                          onChange={u('customerAddress')}
                          className={iCls}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Region</label>
                        <input
                          placeholder="City/Area"
                          value={form.customerRegion}
                          onChange={u('customerRegion')}
                          className={iCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Sector</label>
                      <select
                        value={form.customerSector}
                        onChange={u('customerSector')}
                        className={iCls}
                      >
                        <option value="">Select Sector...</option>
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))] italic">
                      * If phone exists, data will be linked to the existing customer.
                    </div>
                  </div>
                )}

                {!editing && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Sales Person ID (Optional)</label>
                      <input
                        placeholder="Leave blank for self"
                        value={form.salesPerson}
                        onChange={u('salesPerson')}
                        className={iCls}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Marketing ID (Optional)</label>
                      <input
                        placeholder="Lead ID"
                        value={form.marketingData}
                        onChange={u('marketingData')}
                        className={iCls}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Call Date</label>
                    <input
                      type="datetime-local"
                      value={form.callDate}
                      onChange={u('callDate')}
                      disabled={isReadOnly}
                      className={iCls}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Call Outcome *</label>
                    <select
                      required
                      value={form.callOutcome}
                      onChange={u('callOutcome')}
                      disabled={isReadOnly}
                      className={iCls}
                    >
                      {OUTCOMES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Type Of Order</label>
                    <select
                      value={form.typeOfOrder}
                      onChange={u('typeOfOrder')}
                      disabled={isReadOnly}
                      className={iCls}
                    >
                      <option value="">Select...</option>
                      {TYPE_OF_ORDER.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Sales Platform</label>
                    <select
                      value={form.salesPlatform}
                      onChange={u('salesPlatform')}
                      disabled={isReadOnly}
                      className={iCls}
                    >
                      <option value="">Select...</option>
                      {SALES_PLATFORM.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Issue</label>
                  <textarea
                    placeholder="Describe the issue or problem"
                    value={form.issue}
                    onChange={u('issue')}
                    rows={2}
                    disabled={isReadOnly}
                    className={iCls}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Order</label>
                  <select
                    value={form.order}
                    onChange={u('order')}
                    className={iCls}
                    disabled={isReadOnly}
                  >
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Follow Up</label>
                    <select
                      value={form.followUp}
                      onChange={u('followUp')}
                      className={iCls}
                      disabled={isReadOnly}
                    >
                      <option value="">Select...</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Follow Up Date</label>
                    <input
                      type="datetime-local"
                      value={form.followUpDate}
                      onChange={u('followUpDate')}
                      disabled={isReadOnly}
                      className={iCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Notes</label>
                  <textarea
                    placeholder="Optional notes"
                    value={form.notes}
                    onChange={u('notes')}
                    rows={3}
                    disabled={isReadOnly}
                    className={iCls}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </form>
            </DialogBody>

            <DialogFooter>
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-2 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none"
                >
                  {isReadOnly ? 'Close' : 'Cancel'}
                </button>
                {isReadOnly ? (
                  // Only show Edit button if they have permission to edit
                  ((!editing?.salesPerson) || (editing?.salesPerson?._id === currentUser?._id) || (currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Manager')) && (
                    <button
                      type="button"
                      key="btn-edit" onClick={(e) => { e.preventDefault(); setIsReadOnly(false); }}
                      className="flex-1 rounded-md bg-[hsl(var(--primary))] py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 transition-all focus-visible:outline-none"
                    >
                      Edit
                    </button>
                  )
                ) : (
                  <button
                    type="submit"
                    form="sales-data-form"
                    disabled={saving}
                    className="protect-mount flex-1 rounded-md bg-[hsl(var(--primary))] py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 transition-all focus-visible:outline-none disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {
        delId && (
          <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in transition-all">
            <div className="rounded-md border border-[hsl(var(--border))]/50 modern-glass-card premium-shadow animate-in-slide m-auto relative p-6 shadow-lg sm:max-w-md w-full">
              <p className="mb-4 font-semibold">Delete this sales data record?</p>
              <div className="flex gap-3">
                <button
                  onClick={del}
                  className="flex-1 rounded-md bg-[hsl(var(--destructive))] py-2 text-sm font-medium text-[hsl(var(--destructive-foreground))] shadow-sm transition-all hover:opacity-90 focus-visible:outline-none"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDelId(null)}
                  className="flex-1 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-2 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Import Data Dialog */}
      <ImportDataDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => {
          setImportDialogOpen(false);
          fetch_();
        }}
      />
    </div >
  );
}

