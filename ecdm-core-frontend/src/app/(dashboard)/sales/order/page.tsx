'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { ClipboardList, Plus, X } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { createSalesOrderColumns, createActionsRenderer, isOrderOwnedByUser, type SalesOrder } from './columns';
import EditSalesOrderDialog from './EditSalesOrderDialog';
import AddQuotationDialog from './AddQuotationDialog';
import { SalesPerformanceWidget } from '@/components/sales/SalesPerformanceWidget';
import { useAuthStore } from '@/features/auth/useAuth';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const Q_STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected', 'Revised'];
const F_STATUSES = ['Pending', 'Won', 'Lost', 'Cancelled'];
const TYPE_OF_ORDER = ['Maintenance', 'General supplies', 'Supply and installation'];
const blank = { customer: '', issueDescription: '' };

export default function SalesOrderPage() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<SalesOrder[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fStatus, setFStatus] = useState('');
  const [fFinalStatus, setFFinalStatus] = useState('');
  const [fTypeOfOrder, setFTypeOfOrder] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SalesOrder | null>(null);
  const [quotationOrder, setQuotationOrder] = useState<SalesOrder | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const [salesLeads, setSalesLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const lim = 10; const tp = Math.ceil(total / lim);

  // Fetch sales leads for dropdown
  useEffect(() => {
    setLoadingLeads(true);
    api.get('/sales/leads?limit=1000')
      .then(res => {
        const leads = res.data?.data || [];
        setSalesLeads(Array.isArray(leads) ? leads : []);
      })
      .catch((err) => { 
        console.error('Failed to fetch sales leads:', err);
        toast.error('Failed to load sales leads for dropdown');
        setSalesLeads([]); 
      })
      .finally(() => setLoadingLeads(false));
  }, []);

  // Fetch customers for dropdown
  useEffect(() => {
    setLoadingCustomers(true);
    api.get('/shared/customers?limit=1000')
      .then(res => {
        const custs = res.data?.data?.data || res.data?.data || [];
        setCustomers(Array.isArray(custs) ? custs : []);
      })
      .catch((err) => { 
        console.error('Failed to fetch customers:', err);
        toast.error('Failed to load customers for dropdown');
        setCustomers([]); 
      })
      .finally(() => setLoadingCustomers(false));
  }, []);


  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim, excludeNotPotential: 'true' };
      if (fStatus) p.quotationStatus = fStatus;
      if (fFinalStatus) p.finalStatus = fFinalStatus;
      if (fTypeOfOrder) p.typeOfOrder = fTypeOfOrder;
      const { data } = await api.get('/sales/orders', { params: p });
      setRows(data.data.data || []);
      setTotal(data.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch sales orders:', err);
      toast.error('Failed to load sales orders');
      setRows([]);
    }
    setLoading(false);
  }, [page, fStatus, fFinalStatus, fTypeOfOrder]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { 
    setEditing(null); 
    setForm(blank); 
    setError(''); 
    setModal(true); 
    setPreviewMode(false); 
  };

  const openE = (r: SalesOrder, isPreview = false) => {
    setEditing(r);
    setPreviewMode(isPreview);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) { if (v !== '') pl[k] = k === 'totalAmount' ? Number(v) : v; }
    
    // Ensure customer and issueDescription are present for new orders
    if (!editing) {
      pl.customer = form.customer;
      pl.issueDescription = form.issueDescription;

      if (!pl.customer || !pl.issueDescription) {
        setError('Customer and Issue Description are required.');
        setSaving(false);
        return;
      }
    }

    try {
      if (editing) await api.put(`/sales/orders/${editing._id}`, pl);
      else await api.post('/sales/orders', pl);
      setModal(false); fetch_();
    } catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  const del = async () => { 
    if (!delId) return; 
    try { 
      await api.delete(`/sales/orders/${delId}`); 
      toast.success('Order deleted successfully');
      fetch_(); 
    } catch (err) {
      console.error('Failed to delete order:', err);
      toast.error('Failed to delete order');
    }
    setDelId(null); 
  };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  // ─── Column Definitions ───────────────────────────────────────────────────
  const columns = createSalesOrderColumns({
    onCreateQuotation: (row: SalesOrder) => setQuotationOrder(row),
    currentUserId: user?._id,
    currentUserRole: user?.role,
  });

  // ─── Row Actions ──────────────────────────────────────────────────────────────
  const renderActions = createActionsRenderer({
    onEdit: (row: SalesOrder) => openE(row, false),
    onPreview: (row: SalesOrder) => openE(row, true),
    onDelete: (row: SalesOrder) => setDelId(row._id),
    currentUserId: user?._id,
    currentUserRole: user?.role,
  });

  // ─── Row ClassName for ownership dimming ─────────────────────────────────────
  const adminRoles = ['Admin', 'SuperAdmin', 'Manager'];
  const isAdmin = adminRoles.includes(user?.role || '');

  const getRowClassName = (row: SalesOrder): string => {
    if (!isAdmin) {
      const owned = isOrderOwnedByUser(row, user?._id);
      if (!owned) {
        return 'opacity-50 grayscale';
      }
    }
    return '';
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-6 pb-4">
      <PageHeader
        title="Sales Orders"
        icon={ClipboardList}
        actions={
          <button onClick={openC} className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:bg-[hsl(var(--primary))]/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"><Plus className="h-4 w-4" />Add</button>
        }
      />

      {/* Sales Performance Widget */}
      <SalesPerformanceWidget />

      <div className="flex gap-3 flex-wrap items-center">
        <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }} className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10">
          <option value="">All Quotation Statuses</option>
          {Q_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fFinalStatus} onChange={e => { setFFinalStatus(e.target.value); setPage(1); }} className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10">
          <option value="">All Final Statuses</option>
          {F_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fTypeOfOrder} onChange={e => { setFTypeOfOrder(e.target.value); setPage(1); }} className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10">
          <option value="">All Order Types</option>
          {TYPE_OF_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* DataTable with Horizontal Scrolling (23 Columns) & RBAC-Protected Bulk Delete */}
      <div className="w-full">
        <DataTable
          data={rows}
          columns={columns}
          loading={loading}
          emptyMessage="No orders found."
          page={page}
          totalPages={tp}
          totalItems={total}
          itemsPerPage={lim}
          onPageChange={setPage}
          bulkDeleteEndpoint="/sales/orders/bulk-delete"
          onBulkDeleteSuccess={fetch_}
          renderActions={renderActions}
          onRowClick={(row) => openE(row, true)}
          rowClassName={getRowClassName}
          defaultVisibility={{
            "customer.address": false,
            "customer.sector": false,
            initialIssue: false,
            orderIssue: false,
            createdAt: false,
            salesPlatform: false,
            siteInspectionDate: false,
            isTechnicalInspectionRequired: false,
            // ✅ CRITICAL FIX: Make quotation columns VISIBLE by default so users can see uploaded files
            quotationFileUrl: true,  // Shows uploaded quotation files
            quotationActions: true,  // Shows dynamic quotation PDF builder
            followUpFirst: false,
            quotationStatusFirstFollowUp: false,
            reasonOfQuotation: false,
            followUpSecond: false,
            statusSecondFollowUp: false,
            followUpThird: false,
            finalStatusThirdFollowUp: false,
            salesPersonId: false,
            salesPersonEmail: true,
            notes: false,
            finalStatus: false,
          }}
        />
      </div>

      {/* Edit Sales Order Dialog - SSOT Compliant */}
      {editing && (
        <EditSalesOrderDialog
          order={editing}
          initialEditMode={!previewMode}
          onClose={() => { setEditing(null); setPreviewMode(false); }}
          onSuccess={() => {
            fetch_();
            setEditing(null);
            setPreviewMode(false);
          }}
        />
      )}

      {/* Add Quotation Dialog */}
      {quotationOrder && (
        <AddQuotationDialog
          order={quotationOrder}
          onClose={() => setQuotationOrder(null)}
          onSuccess={() => {
            fetch_();
            setQuotationOrder(null);
          }}
        />
      )}

      {/* Create New Order Modal (Scrollable) */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in transition-all">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-[hsl(var(--border))] modern-glass-card relative premium-shadow animate-in-slide shadow-2xl overflow-hidden min-h-0">
            <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]/30 flex-none bg-white">
              <h2 className="text-lg font-bold">New Order</h2>
              <button 
                onClick={() => setModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <form onSubmit={save} className="space-y-4">
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Select Customer</label>
                    <SearchableSelect
                      options={customers.map(c => ({
                        id: c._id,
                        label: c.name,
                        subLabel: c.customerId
                      }))}
                      value={form.customer}
                      onChange={(val) => setForm(p => ({ ...p, customer: val }))}
                      placeholder="Select Customer..."
                      loading={loadingCustomers}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Order Issue / Description</label>
                    <textarea 
                      required
                      placeholder="Describe the issue or purpose of this order..."
                      value={form.issueDescription}
                      onChange={u('issueDescription')}
                      className={`${iCls} h-32 py-3 resize-none`}
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-red-500 font-medium px-1">{error}</p>}
                <div className="flex gap-3 pt-6 mt-4 border-t border-[hsl(var(--border))]/30">
                  <button type="submit" disabled={saving} className="flex-1 rounded-md bg-[hsl(var(--primary))] py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 transition-all focus-visible:outline-none disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
                  <button type="button" onClick={() => setModal(false)} className="flex-1 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-2 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none">Cancel</button>
                </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in transition-all">
          <div className="rounded-md border border-[hsl(var(--border))]/50 modern-glass-card premium-shadow animate-in-slide relative p-6 shadow-lg sm:max-w-md w-full">
            <p className="mb-4 font-semibold">Delete this order?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-md bg-[hsl(var(--destructive))] py-2 text-sm font-medium text-[hsl(var(--destructive-foreground))] shadow-sm transition-all hover:opacity-90 focus-visible:outline-none">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-2 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}


