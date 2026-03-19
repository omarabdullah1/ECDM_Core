'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Wrench, X, Trash2, Plus } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import { columns, WorkOrder } from './columns';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PartEntry {
  id: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
}

type FormData = {
  customerOrderId: string;
  maintenanceEngineer: string;
  taskDate: string;
  startMaintenanceDate: string;
  endMaintenanceDate: string;
  punctuality: string;
  reasonForDelay: string;
  taskCompleted: string;
  reasonForIncompletion: string;
  rating: string;
  sparePartsAvailability: string;
  notes: string;
};

const blank: FormData = {
  customerOrderId: '',
  maintenanceEngineer: '',
  taskDate: '',
  startMaintenanceDate: '',
  endMaintenanceDate: '',
  punctuality: '',
  reasonForDelay: '',
  taskCompleted: '',
  reasonForIncompletion: '',
  rating: '',
  sparePartsAvailability: '',
  notes: '',
};

export default function WorkOrderPage() {
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fPunctuality, setFPunct] = useState('');
  const [fTaskCompleted, setFTaskCompleted] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [form, setForm] = useState<FormData>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);

  // Dropdown data for Smart Dialog
  const [priceList, setPriceList] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Parts management for dynamic partsUsed array
  const [partsUsed, setPartsUsed] = useState<PartEntry[]>([]);

  // Fetch dropdown data when modal opens
  useEffect(() => {
    if (modal) {
      setLoadingLookups(true);
      Promise.all([
        api.get('/finance/inventory?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/customer/orders?limit=1000').catch(() => ({ data: { data: [] } }))
      ])
        .then(([priceRes, ordersRes]) => {
          const priceData = priceRes.data?.data || priceRes.data || [];
          const ordersData = ordersRes.data?.data || ordersRes.data || [];
          setPriceList(Array.isArray(priceData) ? priceData : []);
          setCustomerOrders(Array.isArray(ordersData) ? ordersData : []);
        })
        .catch(() => {
          setPriceList([]);
          setCustomerOrders([]);
        })
        .finally(() => setLoadingLookups(false));
    }
  }, [modal]);

  // Parts management functions
  const generatePartId = () => `part-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addPart = () => {
    setPartsUsed([
      ...partsUsed,
      { id: generatePartId(), inventoryItemId: '', itemName: '', quantity: 1, unitCost: 0 }
    ]);
  };

  const removePart = (id: string) => {
    setPartsUsed(partsUsed.filter(p => p.id !== id));
  };

  const updatePart = (id: string, field: keyof PartEntry, value: any) => {
    setPartsUsed(partsUsed.map(p => {
      if (p.id !== id) return p;

      const updated = { ...p, [field]: value };

      // Auto-fill unitCost when inventory item changes
      if (field === 'inventoryItemId') {
        const item = priceList.find(i => i._id === value);
        if (item) {
          updated.unitCost = item.price || 0;
          updated.itemName = item.itemName || '';
        }
      }

      return updated;
    }));
  };

  const lim = 10;
  const tp = Math.ceil(total / lim);

  const PUNCTUALITIES = ['Same time', 'Late'];
  const TASK_COMPLETED = ['Yes', 'No'];
  const SPARE_PARTS_AVAILABILITY = ['Available', 'Not Available', 'Requested'];
  const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fPunctuality) p.punctuality = fPunctuality;
      if (fTaskCompleted) p.taskCompleted = fTaskCompleted;
      const { data } = await api.get('/operations/work-order', { params: p });
      setRows(data.data.data);
      setTotal(data.data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch work orders:', error);
      toast.error('Failed to load work orders');
    }
    setLoading(false);
  }, [page, fPunctuality, fTaskCompleted]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  // ─── Edit Handler ────────────────────────────────────────────────────────
  const openE = (r: WorkOrder) => {
    setEditing(r);
    // customerOrderId can be either an Object (populated) or string (ID only)
    const orderId = typeof r.customerOrderId === 'object' && r.customerOrderId !== null 
      ? r.customerOrderId._id 
      : (r.customerOrderId as any) || '';
    
    // Initialize partsUsed from existing work order
    const existingParts: PartEntry[] = [];
    if (r.partsUsed && r.partsUsed.length > 0) {
      // Map from populated partsUsed array
      r.partsUsed.forEach((part: any) => {
        existingParts.push({
          id: generatePartId(),
          inventoryItemId: typeof part.inventoryItemId === 'object' ? part.inventoryItemId._id : part.inventoryItemId,
          itemName: part.inventoryItemId?.itemName || '',
          quantity: part.quantity || 1,
          unitCost: part.unitCost || 0,
        });
      });
    } else if (r.sparePartsId) {
      // Legacy: Convert old sparePartsId to partsUsed
      const item = priceList.find(i => i._id === r.sparePartsId || i.sparePartsId === r.sparePartsId);
      if (item) {
        existingParts.push({
          id: generatePartId(),
          inventoryItemId: item._id,
          itemName: item.itemName,
          quantity: 1,
          unitCost: item.price || 0,
        });
      }
    }
    setPartsUsed(existingParts);

    setForm({
      customerOrderId: orderId,
      maintenanceEngineer: r.maintenanceEngineer || '',
      taskDate: r.taskDate ? r.taskDate.split('T')[0] : '',
      startMaintenanceDate: r.startMaintenanceDate ? r.startMaintenanceDate.split('T')[0] : '',
      endMaintenanceDate: r.endMaintenanceDate ? r.endMaintenanceDate.split('T')[0] : '',
      punctuality: r.punctuality || '',
      reasonForDelay: r.reasonForDelay || '',
      taskCompleted: r.taskCompleted || '',
      reasonForIncompletion: r.reasonForIncompletion || '',
      rating: r.rating || '',
      sparePartsAvailability: r.sparePartsAvailability || '',
      notes: r.notes || '',
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

    // Format partsUsed array for backend
    pl.partsUsed = partsUsed
      .filter(p => p.inventoryItemId !== '')
      .map(p => ({
        inventoryItemId: p.inventoryItemId,
        quantity: p.quantity,
        unitCost: p.unitCost,
      }));

    try {
      if (editing) {
        await api.put(`/operations/work-order/${editing._id}`, pl);
        toast.success('Work order updated successfully');
      }
      setModal(false);
      setPartsUsed([]);
      fetch_();
    } catch (e: unknown) {
      const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save';
      setError(message);
      toast.error(message);
    }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    try {
      await api.delete(`/operations/work-order/${delId}`);
      toast.success('Work order deleted successfully');
      fetch_();
    } catch (error) {
      console.error('Failed to delete work order:', error);
      toast.error('Failed to delete work order');
    }
    setDelId(null);
  };

  const u = (f: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-7 w-7 text-[hsl(var(--primary))]" />
          <h1 className="text-2xl font-bold">Work Orders</h1>
        </div>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          Work orders are auto-created when a site inspection is scheduled
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={fPunctuality}
          onChange={(e) => {
            setFPunct(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm"
        >
          <option value="">All Punctuality</option>
          {PUNCTUALITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={fTaskCompleted}
          onChange={(e) => {
            setFTaskCompleted(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm"
        >
          <option value="">Task Completed</option>
          {TASK_COMPLETED.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Data Table with Horizontal Scrolling (28 columns) */}
      <div className="overflow-x-auto w-full">
        <DataTable
          data={rows}
          columns={columns}
          loading={loading}
          emptyMessage="No work orders found. Work orders are automatically created when a site inspection date is set on a Sales Order."
          page={page}
          totalPages={tp}
          totalItems={total}
          itemsPerPage={lim}
          onPageChange={setPage}
          bulkDeleteEndpoint="/operations/work-order/bulk-delete"
          onBulkDeleteSuccess={fetch_}
          meta={{
            onEdit: openE,
            onDelete: (id: string) => setDelId(id),
          }}
          defaultVisibility={{
            address: false,
            region: false,
            sector: false,
            visitSite: false,
            engineerName: false,
            actualVisitDate: false,
            devicePickupType: false,
            startDateOrder: false,
            taskDate: false,
            maintenanceEngineer: false,
            startMaintenanceDate: false,
            endMaintenanceDate: false,
            punctuality: false,
            late: false,
            reasonForDelay: false,
            reasonForIncompletion: false,
            rating: false,
            endDateOrder: false,
            deviceReturned: false,
            sparePartsId: false,
            sparePartsAvailability: false,
            notes: false,
          }}
        />
      </div>

      {/* Edit Modal */}
      {modal && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Edit Work Order</h2>
              <button onClick={() => setModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Order - Smart Dropdown */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Customer Order
                    {form.customerOrderId && <span className="text-xs text-green-600 ml-2">(Auto-linked)</span>}
                  </label>
                  <select
                    value={form.customerOrderId}
                    onChange={(e) => {
                      const selected = customerOrders.find(o => o._id === e.target.value);
                      setForm({
                        ...form,
                        customerOrderId: e.target.value,
                        // Auto-fill engineer from order if available
                        maintenanceEngineer: selected?.engineerName || form.maintenanceEngineer,
                      });
                    }}
                    className={iCls}
                  >
                    <option value="">Select Customer Order</option>
                    {loadingLookups ? (
                      <option disabled>Loading orders...</option>
                    ) : customerOrders.length === 0 ? (
                      <option disabled>No orders available</option>
                    ) : (
                      customerOrders.map(order => (
                        <option key={order._id} value={order._id}>
                          {order.issue?.substring(0, 40) || 'Order'} - {order.customerId?.name || 'Unknown Customer'}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Maintenance Engineer */}
                <div>
                  <label className="block text-sm font-medium mb-1">Maintenance Engineer</label>
                  <input
                    placeholder="Maintenance Engineer Name"
                    value={form.maintenanceEngineer}
                    onChange={u('maintenanceEngineer')}
                    className={iCls}
                  />
                </div>

                {/* Task Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">Task Date</label>
                  <input
                    type="date"
                    value={form.taskDate}
                    onChange={u('taskDate')}
                    className={iCls}
                  />
                </div>

                {/* Start Maintenance Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">Start Maintenance Date</label>
                  <input
                    type="date"
                    value={form.startMaintenanceDate}
                    onChange={u('startMaintenanceDate')}
                    className={iCls}
                  />
                </div>

                {/* End Maintenance Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">End Maintenance Date</label>
                  <input
                    type="date"
                    value={form.endMaintenanceDate}
                    onChange={u('endMaintenanceDate')}
                    className={iCls}
                  />
                </div>

                {/* Punctuality */}
                <div>
                  <label className="block text-sm font-medium mb-1">Punctuality</label>
                  <select value={form.punctuality} onChange={u('punctuality')} className={iCls}>
                    <option value="">Select Punctuality</option>
                    {PUNCTUALITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason for Delay */}
                <div>
                  <label className="block text-sm font-medium mb-1">Reason for Delay</label>
                  <input
                    placeholder="Reason for delay (if late)"
                    value={form.reasonForDelay}
                    onChange={u('reasonForDelay')}
                    className={iCls}
                  />
                </div>

                {/* Task Completed */}
                <div>
                  <label className="block text-sm font-medium mb-1">Task Completed</label>
                  <select value={form.taskCompleted} onChange={u('taskCompleted')} className={iCls}>
                    <option value="">Select Status</option>
                    {TASK_COMPLETED.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason for Incompletion */}
                <div>
                  <label className="block text-sm font-medium mb-1">Reason (If No)</label>
                  <input
                    placeholder="Reason for incompletion"
                    value={form.reasonForIncompletion}
                    onChange={u('reasonForIncompletion')}
                    className={iCls}
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium mb-1">Rating</label>
                  <input
                    placeholder="Rating"
                    value={form.rating}
                    onChange={u('rating')}
                    className={iCls}
                  />
                </div>

                {/* Spare Parts Availability */}
                <div>
                  <label className="block text-sm font-medium mb-1">Spare Parts Availability</label>
                  <select
                    value={form.sparePartsAvailability}
                    onChange={u('sparePartsAvailability')}
                    className={iCls}
                  >
                    <option value="">Select Availability</option>
                    {SPARE_PARTS_AVAILABILITY.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Parts Used Section */}
              <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Parts Used</label>
                  <button
                    type="button"
                    onClick={addPart}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Part
                  </button>
                </div>

                {partsUsed.length === 0 ? (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                    No parts added. Click "Add Part" to add parts from inventory.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[hsl(var(--muted-foreground))] px-1">
                      <div className="col-span-1">#</div>
                      <div className="col-span-5">Part</div>
                      <div className="col-span-2">Qty</div>
                      <div className="col-span-2">Unit Cost</div>
                      <div className="col-span-1"></div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    {/* Parts List */}
                    {partsUsed.map((part, index) => (
                      <div key={part.id} className="grid grid-cols-12 gap-2 items-center bg-[hsl(var(--accent))]/50 dark:bg-[hsl(var(--accent))]/30 rounded-lg p-2">
                        {/* Part Number */}
                        <div className="col-span-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                          {index + 1}
                        </div>
                        
                        {/* Part Select */}
                        <div className="col-span-5">
                          <select
                            value={part.inventoryItemId}
                            onChange={(e) => updatePart(part.id, 'inventoryItemId', e.target.value)}
                            className={iCls}
                          >
                            <option value="">Select Part</option>
                            {loadingLookups ? (
                              <option disabled>Loading...</option>
                            ) : priceList.filter(item => item.stockNumber > 0).length === 0 ? (
                              <option disabled>No parts in stock</option>
                            ) : (
                              priceList
                                .filter(item => item.stockNumber > 0)
                                .map(item => (
                                  <option key={item._id} value={item._id}>
                                    {item.itemName} (Stock: {item.stockNumber})
                                  </option>
                                ))
                            )}
                          </select>
                        </div>
                        
                        {/* Quantity */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            value={part.quantity}
                            onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)}
                            className={iCls}
                          />
                        </div>
                        
                        {/* Unit Cost (read-only) */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={part.unitCost}
                            readOnly
                            className={`${iCls} bg-[hsl(var(--muted))]/50 cursor-not-allowed`}
                          />
                        </div>
                        
                        {/* Subtotal */}
                        <div className="col-span-1 text-right text-xs font-medium">
                          EGP {(part.quantity * part.unitCost).toFixed(0)}
                        </div>
                        
                        {/* Remove Button */}
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removePart(part.id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Total */}
                    <div className="flex justify-end pt-2 border-t border-[hsl(var(--border))]">
                      <span className="text-sm font-semibold">
                        Total Parts Cost: EGP {partsUsed.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes (full width) */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  placeholder="Notes"
                  value={form.notes}
                  onChange={u('notes')}
                  rows={3}
                  className={iCls}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModal(false);
                    setPartsUsed([]);
                  }}
                  className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm"
                >
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
            <p className="mb-4 font-semibold">Delete this work order?</p>
            <div className="flex gap-3">
              <button
                onClick={del}
                className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white"
              >
                Delete
              </button>
              <button
                onClick={() => setDelId(null)}
                className="flex-1 rounded-xl border py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
