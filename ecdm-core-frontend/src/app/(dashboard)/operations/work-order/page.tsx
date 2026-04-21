'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Wrench, X, Trash2, Plus, Star, Edit2, Eye } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { columns, WorkOrder } from './columns';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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
  const [internalPreviewMode, setInternalPreviewMode] = useState(true);

  const effectivelyReadOnly = !!(modal && editing && internalPreviewMode);
  const isActuallyEditing = !!(modal && editing && !internalPreviewMode);
  const isAdding = modal && !editing;

  // Dropdown data for Smart Dialog
  const [priceList, setPriceList] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Parts management for dynamic partsUsed array
  const [partsUsed, setPartsUsed] = useState<PartEntry[]>([]);

  // Fetch dropdown data when modal opens
  useEffect(() => {
    if (modal) {
      setLoadingLookups(true);
      Promise.all([
        api.get('/operations/price-list?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/customer/orders?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/hr/users?limit=1000').catch(() => ({ data: { data: [] } }))
      ])
        .then(([priceRes, ordersRes, usersRes]) => {
          // Drill down to the actual data array: response.data.data.data
          const priceData = priceRes.data?.data?.data || priceRes.data?.data || priceRes.data || [];
          const ordersData = ordersRes.data?.data?.data || ordersRes.data?.data || ordersRes.data || [];
          const usersData = usersRes.data?.data?.data || usersRes.data?.data || usersRes.data || [];

          setPriceList(Array.isArray(priceData) ? priceData : []);
          setCustomerOrders(Array.isArray(ordersData) ? ordersData : []);

          const engineerList = Array.isArray(usersData)
            ? usersData.filter(u => u.role === 'MaintenanceEngineer' || u.role === 'Technician')
            : [];
          setEngineers(engineerList);
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

      // Auto-fill details when inventory item changes
      if (field === 'inventoryItemId') {
        const item = priceList.find(i =>
          (i._id && String(i._id) === String(value)) ||
          (i.sparePartsId && String(i.sparePartsId) === String(value))
        );
        if (item) {
          updated.unitCost = item.unitPrice || 0;
          updated.itemName = item.itemName || '';
          // Always standardize to the primary _id string
          updated.inventoryItemId = String(item._id);
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
  const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fPunctuality) p.punctuality = fPunctuality;
      if (fTaskCompleted) p.taskCompleted = fTaskCompleted;
      const { data } = await api.get('/operations/work-orders', { params: p });
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
  const openE = (r: WorkOrder, mode: 'preview' | 'edit' = 'preview') => {
    setEditing(r);
    setInternalPreviewMode(mode === 'preview');
    // customerOrderId can be either an Object (populated) or string (ID only)
    const orderId = typeof r.customerOrderId === 'object' && r.customerOrderId !== null
      ? r.customerOrderId._id
      : (r.customerOrderId as any) || '';

    // Initialize partsUsed from existing work order
    const existingParts: PartEntry[] = [];
    if (r.partsUsed && r.partsUsed.length > 0) {
      r.partsUsed.forEach((part: any) => {
        // The backend schema uses priceListId, but legacy might use inventoryItemId
        const rawId = part.priceListId || part.inventoryItemId;
        const partId = typeof rawId === 'object' ? rawId?._id : rawId;

        // Find in priceList (matching either _id or legacy sparePartsId)
        const itemInList = priceList.find(i =>
          (i._id && String(i._id) === String(partId)) ||
          (i.sparePartsId && String(i.sparePartsId) === String(partId))
        );

        existingParts.push({
          id: generatePartId(),
          inventoryItemId: itemInList ? String(itemInList._id) : (partId ? String(partId) : ''),
          itemName: part.itemName || part.inventoryItemId?.itemName || itemInList?.itemName || '',
          quantity: part.quantity || 1,
          unitCost: part.unitCost || itemInList?.unitPrice || 0,
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
      sparePartsAvailability: r.sparePartsAvailability || (existingParts.length > 0 ? 'Available' : 'Not Needed'),
      notes: r.notes || '',
    });
    setError('');
    setModal(true);
  };

  // Fetch feedback when customerOrderId changes or modal opens with an order
  const [fetchingFeedback, setFetchingFeedback] = useState(false);
  const [feedbackFound, setFeedbackFound] = useState(false);

  useEffect(() => {
    if (modal && form.customerOrderId) {
      setFetchingFeedback(true);
      setFeedbackFound(false);
      api.get('/customer/feedback', { params: { customerOrderId: form.customerOrderId, limit: 1 } })
        .then(res => {
          const list = res.data?.data?.data || res.data?.data || [];
          if (Array.isArray(list) && list.length > 0) {
            const feedback = list[0];
            if (feedback.ratingOperation) {
              setForm(prev => ({ ...prev, rating: feedback.ratingOperation }));
              setFeedbackFound(true);
            }
          }
        })
        .catch(err => console.error('Failed to fetch feedback:', err))
        .finally(() => setFetchingFeedback(false));
    }
  }, [modal, form.customerOrderId]);

  // Handle automatic Spare Parts Availability
  useEffect(() => {
    if (modal) {
      const status = partsUsed.length > 0 ? 'Available' : 'Not Needed';
      if (form.sparePartsAvailability !== status) {
        setForm(prev => ({ ...prev, sparePartsAvailability: status }));
      }
    }
  }, [partsUsed.length, modal]);

  // Sync partsUsed with priceList data once priceList is fetched
  useEffect(() => {
    if (priceList.length > 0 && partsUsed.length > 0) {
      setPartsUsed(prev => {
        let changed = false;
        const next = prev.map(p => {
          // Robust lookup
          const itemInList = priceList.find(i =>
            (i._id && String(i._id) === String(p.inventoryItemId)) ||
            (i.sparePartsId && String(i.sparePartsId) === String(p.inventoryItemId))
          );

          if (itemInList) {
            const currentId = String(p.inventoryItemId);
            const targetId = String(itemInList._id);
            const currentName = p.itemName || '';
            const targetName = itemInList.itemName || '';

            // If ID needs standardization or name/cost is missing
            if (currentId !== targetId || !currentName || p.unitCost === 0) {
              changed = true;
              return {
                ...p,
                inventoryItemId: targetId,
                itemName: targetName,
                unitCost: p.unitCost || itemInList.unitPrice || 0
              };
            }
          }
          return p;
        });
        return changed ? next : prev;
      });
    }
  }, [priceList, modal]);

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
        priceListId: p.inventoryItemId, // Backend uses priceListId
        inventoryItemId: p.inventoryItemId, // Keep for legacy/frontend compat
        quantity: p.quantity,
        unitCost: p.unitCost,
      }));

    try {
      if (editing) {
        await api.put(`/operations/work-orders/${editing._id}`, pl);
        toast.success('Work order updated successfully');
      }
      setModal(false);
      setInternalPreviewMode(true);
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
      await api.delete(`/operations/work-orders/${delId}`);
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
    <div className="h-full flex flex-col min-h-0 space-y-6 pb-4">
      {/* Header */}
      <PageHeader
        title="Work Orders"
        icon={Wrench}
        description="Work orders are auto-created when a site inspection is scheduled"
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap animate-in-slide stagger-2">
        <select
          value={fPunctuality}
          onChange={(e) => {
            setFPunct(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10"
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
          className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10"
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
      <div className="w-full flex-1 min-h-0">
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
          bulkDeleteEndpoint="/operations/work-orders/bulk-delete"
          onBulkDeleteSuccess={fetch_}
          onRowClick={(r: WorkOrder) => openE(r, 'preview')}
          meta={{
            onEdit: (r: WorkOrder) => openE(r, 'edit'),
            onDelete: (id: string) => setDelId(id),
          }}
          defaultVisibility={{
            address: true,
            region: false,
            sector: false,
            visitSite: false,
            engineerName: false,
            actualVisitDate: false,
            devicePickupType: false,
            startDateOrder: false,
            taskDate: true,
            maintenanceEngineer: true,
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
            sparePartsAvailability: true,
            notes: false,
          }}
        />
      </div>

      {/* Edit/Preview Modal */}
      <Dialog open={modal} onOpenChange={(open) => !open && setModal(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div>
              <DialogTitle>{effectivelyReadOnly ? 'Work Order Preview' : (isAdding ? 'Create Work Order' : 'Edit Work Order')}</DialogTitle>
              {editing && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  ID: {editing._id} • Engineering: {editing.maintenanceEngineer || '-'}
                  {effectivelyReadOnly && <span className="ml-2 text-amber-600 font-semibold">• Preview Mode</span>}
                </p>
              )}
            </div>
          </DialogHeader>

          <DialogBody>
            <form id="work-order-form" onSubmit={save} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Order - Smart Dropdown (Always Read-Only) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Customer Order
                    <span className="text-xs text-green-600 ml-2">(Auto-linked)</span>
                  </label>
                  <div className={`${iCls} bg-gray-50 flex items-center text-gray-600 font-medium border-dashed cursor-not-allowed overflow-hidden truncate`} title={(() => {
                    const selected = customerOrders.find(o => o._id === form.customerOrderId);
                    const base = selected || (editing?.customerOrderId && typeof editing.customerOrderId === 'object' ? editing.customerOrderId : null);
                    if (base) {
                      return `[ID: ${base.orderId || base._id?.substring(0, 8)}] ${base.customerId?.name || 'Unknown'} - ${base.issue || 'No Issue Title'}`;
                    }
                    return form.customerOrderId || 'No Order Linked';
                  })()}>
                    {(() => {
                      const selected = customerOrders.find(o => o._id === form.customerOrderId);
                      const base = selected || (editing?.customerOrderId && typeof editing.customerOrderId === 'object' ? editing.customerOrderId : null);
                      if (base) {
                        const idStr = base.orderId || (typeof base._id === 'string' ? base._id.substring(0, 6) : 'N/A');
                        const nameStr = (typeof base.customerId === 'object' ? base.customerId?.name : base.customerId) || 'Unknown';
                        const issueStr = base.issue || '-';
                        return `[#${idStr}] ${nameStr} — ${issueStr.substring(0, 30)}${issueStr.length > 30 ? '...' : ''}`;
                      }
                      return form.customerOrderId || 'No Order Linked';
                    })()}
                  </div>
                </div>

                {/* Maintenance Engineer */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-1">Maintenance Engineer</label>
                  <Select
                    value={form.maintenanceEngineer}
                    onChange={u('maintenanceEngineer')}
                    disabled={effectivelyReadOnly}
                  >
                    <option value="">Select Engineer</option>
                    {engineers.map(eng => (
                      <option key={eng._id} value={eng.fullName || eng.name}>
                        {eng.fullName || eng.name} ({eng.role})
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Task Date */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-1">Task Date</label>
                  <Input
                    type="date"
                    value={form.taskDate}
                    onChange={u('taskDate')}
                    disabled={effectivelyReadOnly}
                  />
                </div>

                {/* Start Maintenance Date */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-1">Start Maintenance Date</label>
                  <Input
                    type="date"
                    value={form.startMaintenanceDate}
                    onChange={u('startMaintenanceDate')}
                    disabled={effectivelyReadOnly}
                  />
                </div>

                {/* End Maintenance Date */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-1">End Maintenance Date</label>
                  <Input
                    type="date"
                    value={form.endMaintenanceDate}
                    onChange={u('endMaintenanceDate')}
                    disabled={effectivelyReadOnly}
                  />
                </div>

                {/* Punctuality */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-1">Punctuality</label>
                  <Select value={form.punctuality} onChange={u('punctuality')} disabled={effectivelyReadOnly}>
                    <option value="">Select Punctuality</option>
                    {PUNCTUALITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Reason for Delay - Conditional */}
                {form.punctuality === 'Late' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
                    <label className="block text-sm font-medium mb-1 text-amber-600">Reason for Delay</label>
                    <Input
                      placeholder="Reason for delay (if late)"
                      value={form.reasonForDelay}
                      onChange={u('reasonForDelay')}
                      disabled={effectivelyReadOnly}
                    />
                  </div>
                )}

                {/* Task Completed */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-1">Task Completed</label>
                  <Select value={form.taskCompleted} onChange={u('taskCompleted')} disabled={effectivelyReadOnly}>
                    <option value="">Select Status</option>
                    {TASK_COMPLETED.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Reason for Incompletion - Conditional */}
                {form.taskCompleted === 'No' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
                    <label className="block text-sm font-medium mb-1 text-destructive">Reason (If No)</label>
                    <Input
                      placeholder="Reason for incompletion"
                      value={form.reasonForIncompletion}
                      onChange={u('reasonForIncompletion')}
                      disabled={effectivelyReadOnly}
                    />
                  </div>
                )}

                {/* Rating - Stars */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-1">Rating</label>
                  <div className="flex items-center gap-1 h-9">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div
                        key={star}
                        className="p-1 transition-transform"
                      >
                        <Star
                          className={`h-6 w-6 ${star <= parseInt(form.rating || '0')
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                            }`}
                        />
                      </div>
                    ))}
                    <span className="ml-2 text-sm font-medium text-gray-500">
                      {form.rating || '0'} / 5 {feedbackFound && <span className="text-[10px] text-green-600 font-bold ml-1">(Auto-linked)</span>}
                    </span>
                  </div>
                </div>

                {/* Spare Parts Availability - Automatic */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-1">
                    Spare Parts Availability
                    <span className="text-xs text-blue-600 ml-2">(Auto)</span>
                  </label>
                  <div className={`${iCls} bg-blue-50/30 flex items-center font-bold px-3 py-1 ${form.sparePartsAvailability === 'Available' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                    {form.sparePartsAvailability || 'Not Needed'}
                  </div>
                </div>
              </div>

              {/* Dynamic Parts Used Section */}
              <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="block text-sm font-medium">Parts Used</label>
                  {!effectivelyReadOnly && (
                    <Button
                      type="button"
                      onClick={addPart}
                      size="sm"
                      className="h-8 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Part
                    </Button>
                  )}
                </div>

                {partsUsed.length === 0 ? (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                    No parts added.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[hsl(var(--muted-foreground))] px-1">
                      <div className="col-span-1">#</div>
                      <div className="col-span-5">Part</div>
                      <div className="col-span-2">Qty</div>
                      <div className="col-span-2">Cost</div>
                      <div className="col-span-2">Total</div>
                    </div>

                    {/* Parts List */}
                    {partsUsed.map((part, index) => (
                      <div key={part.id} className="grid grid-cols-12 gap-2 items-center bg-[hsl(var(--accent))]/30 rounded-lg p-2">
                        <div className="col-span-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                          {index + 1}
                        </div>

                        <div className="col-span-5">
                          <Select
                            value={part.inventoryItemId}
                            onChange={(e) => updatePart(part.id, 'inventoryItemId', e.target.value)}
                            disabled={effectivelyReadOnly}
                          >
                            <option value="">Select Part</option>
                            {priceList.map(item => (
                              <option key={item._id} value={item._id}>
                                {item.itemName} ({item.sparePartsId})
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="1"
                            value={part.quantity}
                            onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)}
                            disabled={effectivelyReadOnly}
                          />
                        </div>

                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={part.unitCost}
                            readOnly
                            className="bg-gray-50"
                          />
                        </div>

                        <div className="col-span-2 flex items-center justify-between">
                          <span className="text-xs font-medium">
                            {(part.quantity * part.unitCost).toFixed(0)}
                          </span>
                          {!effectivelyReadOnly && (
                            <button
                              type="button"
                              onClick={() => removePart(part.id)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end pt-2 border-t border-[hsl(var(--border))]">
                      <span className="text-sm font-semibold">
                        Total Parts Cost: EGP {partsUsed.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  placeholder="Notes"
                  value={form.notes}
                  onChange={u('notes')}
                  rows={3}
                  disabled={effectivelyReadOnly}
                  className={`${iCls} min-h-[80px] resize-none`}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
          </DialogBody>

          <DialogFooter>
            <div className="flex gap-3 w-full">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setModal(false);
                  setPartsUsed([]);
                }}
                className="flex-1"
              >
                {effectivelyReadOnly ? 'Close' : 'Cancel'}
              </Button>
              {effectivelyReadOnly ? (
                <Button
                  key="btn-edit"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setInternalPreviewMode(false);
                  }}
                  className="flex-1 gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Order
                </Button>
              ) : (
                <Button
                  key="btn-save"
                  type="submit"
                  form="work-order-form"
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {delId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in transition-all">
          <div className="rounded-md border border-[hsl(var(--border))]/50 modern-glass-card premium-shadow animate-in-slide m-auto relative p-6 shadow-lg sm:max-w-md w-full">
            <p className="mb-4 font-semibold">Delete this work order?</p>
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
      )}
    </div>
  );
}
