'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { ClipboardList, Plus, X } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { createSalesOrderColumns, createActionsRenderer, type SalesOrder } from './columns';
import EditSalesOrderDialog from './EditSalesOrderDialog';
import AddQuotationDialog from './AddQuotationDialog';

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const Q_STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected', 'Revised'];
const F_STATUSES = ['Pending', 'Won', 'Lost', 'Cancelled'];
const blank = { salesLead: '', quotationStatus: 'Draft', finalStatus: '', totalAmount: '', notes: '' };

export default function SalesOrderPage() {
  const [rows, setRows] = useState<SalesOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fStatus, setFStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SalesOrder | null>(null);
  const [quotationOrder, setQuotationOrder] = useState<SalesOrder | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fStatus) p.quotationStatus = fStatus;
      const { data } = await api.get('/sales/orders', { params: p });
      setRows(data.data.data); setTotal(data.data.pagination.total);
    } catch { }
    setLoading(false);
  }, [page, fStatus]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: SalesOrder) => { 
    // For edit, we now use the dedicated EditSalesOrderDialog
    setEditing(r); 
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
  const del = async () => { if (!delId) return; try { await api.delete(`/sales/orders/${delId}`); fetch_(); } catch { } setDelId(null); };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  // ─── Column Definitions ───────────────────────────────────────────────────
  const columns = createSalesOrderColumns({
    onCreateQuotation: (row: SalesOrder) => setQuotationOrder(row)
  });

  // ─── Row Actions ──────────────────────────────────────────────────────────────
  const renderActions = createActionsRenderer({
    onEdit: openE,
    onDelete: (row: SalesOrder) => setDelId(row._id),
    // onHistory: (row: SalesOrder) => console.log('History for:', row._id), // Optional
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><ClipboardList className="h-7 w-7 text-[hsl(var(--primary))]" /><h1 className="text-2xl font-bold">Sales Orders</h1></div>
        <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"><Plus className="h-4 w-4" />Add</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {Q_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* DataTable with Horizontal Scrolling (23 Columns) & RBAC-Protected Bulk Delete */}
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
        <DataTable
          data={rows}
          columns={columns}
          loading={loading}
          emptyMessage="No orders found."
          page={page}
          totalPages={tp}
          onPageChange={setPage}
          bulkDeleteEndpoint="/sales/orders/bulk-delete"
          onBulkDeleteSuccess={fetch_}
          renderActions={renderActions}
        />
      </div>

      {/* Edit Sales Order Dialog - SSOT Compliant */}
      {editing && (
        <EditSalesOrderDialog
          order={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            fetch_();
            setEditing(null);
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

      {/* Create New Order Modal (Simple) */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">New Order</h2><button onClick={() => setModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={save} className="space-y-4">
              <input placeholder="Sales Lead ID" value={form.salesLead} onChange={u('salesLead')} className={iCls} />
              <select required value={form.quotationStatus} onChange={u('quotationStatus')} className={iCls}>{Q_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select value={form.finalStatus} onChange={u('finalStatus')} className={iCls}><option value="">Final Status (optional)</option>{F_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <input type="number" placeholder="Total Amount (EGP)" value={form.totalAmount} onChange={u('totalAmount')} className={iCls} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <p className="mb-4 font-semibold">Delete this order?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
