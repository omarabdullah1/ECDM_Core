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

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const Q_STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected', 'Revised'];
const F_STATUSES = ['Pending', 'Won', 'Lost', 'Cancelled'];
const TYPE_OF_ORDER = ['Maintenance', 'General supplies', 'Supply and installation'];
const blank = { salesLead: '', quotationStatus: 'Draft', finalStatus: '', totalAmount: '', notes: '' };

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

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); setPreviewMode(false); };
  const openE = (r: SalesOrder, isPreview = false) => {
    setEditing(r);
    setPreviewMode(isPreview);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) { if (v !== '') pl[k] = k === 'totalAmount' ? Number(v) : v; }
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
          readOnly={previewMode}
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
              {/* Sales Lead Dropdown */}
              <div>
                <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Sales Lead</label>
                <select 
                  required 
                  value={form.salesLead} 
                  onChange={u('salesLead')} 
                  className={iCls}
                >
                  <option value="">Select Sales Lead...</option>
                  {loadingLeads ? (
                    <option disabled>Loading leads...</option>
                  ) : salesLeads.length === 0 ? (
                    <option disabled>No leads available</option>
                  ) : (
                    salesLeads.map(lead => (
                      <option key={lead._id} value={lead._id}>
                        {lead.customerId?.name || 'Customer'} - {(lead.issue || '').substring(0, 40)}{(lead.issue || '').length > 40 ? '...' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <select required value={form.quotationStatus} onChange={u('quotationStatus')} className={iCls}>{Q_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select value={form.finalStatus} onChange={u('finalStatus')} className={iCls}><option value="">Final Status (optional)</option>{F_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <input type="number" placeholder="Total Amount (EGP)" value={form.totalAmount} onChange={u('totalAmount')} className={iCls} />
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

