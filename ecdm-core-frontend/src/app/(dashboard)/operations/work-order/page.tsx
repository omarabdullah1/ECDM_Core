'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/features/auth/useAuth';
import { Wrench, X, Trash2, Plus, Star, Edit2, Eye, ShoppingCart } from 'lucide-react';
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
  InventoryItemId: string;
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
  engineerId: string;
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
  engineerId: '',
};

export default function WorkOrderPage() {
  const { user } = useAuthStore();
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
  const [Inventory, setInventory] = useState<any[]>([]);
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
        api.get('/operations/inventory?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/customer/orders?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/hr/users?limit=1000').catch(() => ({ data: { data: [] } }))
      ])
        .then(([priceRes, ordersRes, usersRes]) => {
          // Drill down to the actual data array: response.data.data.data
          const priceData = priceRes.data?.data?.data || priceRes.data?.data || priceRes.data || [];
          const ordersData = ordersRes.data?.data?.data || ordersRes.data?.data || ordersRes.data || [];
          const usersData = usersRes.data?.data?.data || usersRes.data?.data || usersRes.data || [];

          setInventory(Array.isArray(priceData) ? priceData : []);
          setCustomerOrders(Array.isArray(ordersData) ? ordersData : []);

          const engineerList = Array.isArray(usersData)
            ? usersData.filter(u => u.role === 'MaintenanceEngineer' || u.role === 'Technician')
            : [];
          setEngineers(engineerList);
        })
        .catch(() => {
          setInventory([]);
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
      { id: generatePartId(), InventoryItemId: '', itemName: '', quantity: 1, unitCost: 0 }
    ]);
  };

  const removePart = (id: string) => {
    setPartsUsed(partsUsed.filter(p => p.id !== id));
  };

  const updatePart = (id: string, field: keyof PartEntry, value: any) => {
    setPartsUsed(partsUsed.map(p => {
      if (p.id !== id) return p;

      const updated = { ...p, [field]: value };

      if (field === 'InventoryItemId') {
        if (value === '') {
          // Reset if unselected
          updated.unitCost = 0;
          updated.itemName = '';
          updated.InventoryItemId = '';
        } else {
          const item = Inventory.find(i =>
            (i._id && String(i._id) === String(value)) ||
            (i.sparePartsId && String(i.sparePartsId) === String(value))
          );
          if (item) {
            updated.unitCost = item.unitPrice || 0;
            updated.itemName = item.itemName || '';
            // Always standardize to the primary _id string
            updated.InventoryItemId = String(item._id);
          }
        }
      }

      return updated;
    }));
  };

  const lim = 10;
  const tp = Math.ceil(total / lim);

  const PUNCTUALITIES = ['Same time', 'Late'];
  const TASK_COMPLETED = ['Yes', 'No'];
  const SPARE_PARTS_AVAILABILITY = ['Available', 'Not Available', 'Requested', 'Not Needed'];
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
    const isTechnicianOrEngineer = user?.role === 'MaintenanceEngineer' || user?.role === 'Technician';
    setInternalPreviewMode(mode === 'preview' || isTechnicianOrEngineer);
    // customerOrderId can be either an Object (populated) or string (ID only)
    const orderId = typeof r.customerOrderId === 'object' && r.customerOrderId !== null
      ? r.customerOrderId._id
      : (r.customerOrderId as any) || '';

    // Initialize partsUsed from existing work order
    const existingParts: PartEntry[] = [];
    if (r.partsUsed && r.partsUsed.length > 0) {
      r.partsUsed.forEach((part: any) => {
        // The backend schema uses inventoryId, but legacy might use InventoryItemId
        const rawId = part.inventoryId || part.InventoryItemId;
        const partId = typeof rawId === 'object' ? rawId?._id : rawId;

        // Find in Inventory (matching either _id or legacy sparePartsId)
        const itemInList = Inventory.find(i =>
          (i._id && String(i._id) === String(partId)) ||
          (i.sparePartsId && String(i.sparePartsId) === String(partId))
        );

        existingParts.push({
          id: generatePartId(),
          InventoryItemId: itemInList ? String(itemInList._id) : (partId ? String(partId) : ''),
          itemName: part.itemName || part.InventoryItemId?.itemName || itemInList?.itemName || '',
          quantity: part.quantity || 1,
          unitCost: part.unitCost || itemInList?.unitPrice || 0,
        });
      });
    } else if (r.sparePartsId) {
      // Legacy: Convert old sparePartsId to partsUsed
      const item = Inventory.find(i => i._id === r.sparePartsId || i.sparePartsId === r.sparePartsId);
      if (item) {
        existingParts.push({
          id: generatePartId(),
          InventoryItemId: item._id,
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
      engineerId: typeof r.engineerId === 'object' ? r.engineerId?._id : (r.engineerId || ''),
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

  // Sync partsUsed with Inventory data once Inventory is fetched
  useEffect(() => {
    if (Inventory.length > 0 && partsUsed.length > 0) {
      setPartsUsed(prev => {
        let changed = false;
        const next = prev.map(p => {
          // Robust lookup
          const itemInList = Inventory.find(i =>
            (i._id && String(i._id) === String(p.InventoryItemId)) ||
            (i.sparePartsId && String(i.sparePartsId) === String(p.InventoryItemId))
          );

          if (itemInList) {
            const currentId = String(p.InventoryItemId);
            const targetId = String(itemInList._id);
            const currentName = p.itemName || '';
            const targetName = itemInList.itemName || '';

            // If ID needs standardization or name/cost is missing
            if (currentId !== targetId || !currentName || p.unitCost === 0) {
              changed = true;
              return {
                ...p,
                InventoryItemId: targetId,
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
  }, [Inventory, modal]);

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setError('');

    // Prepare payload
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== '') pl[k] = v;
    }

    // Filter out parts that don't have a selection (fixes "inventoryId required" error)
    pl.partsUsed = partsUsed
      .filter(p => p.InventoryItemId && p.InventoryItemId.trim() !== '')
      .map(p => ({
        inventoryId: p.InventoryItemId, // Backend uses inventoryId
        InventoryItemId: p.InventoryItemId, // Keep for legacy/frontend compat
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
            onEdit: (user?.role === 'MaintenanceEngineer' || user?.role === 'Technician') ? undefined : (r: WorkOrder) => openE(r, 'edit'),
            onPreview: (r: WorkOrder) => openE(r, 'preview'),
            onDelete: (user?.role === 'SuperAdmin' || user?.role === 'Admin') ? (id: string) => setDelId(id) : undefined,
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
              {/* SECTION: Order Foundation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                {/* Customer Order Info */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-2">Linked Customer Order</label>
                  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center rounded-full shrink-0">
                      <ShoppingCart size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">
                        {(() => {
                          const base = customerOrders.find(o => o._id === form.customerOrderId) || (editing?.customerOrderId && typeof editing.customerOrderId === 'object' ? editing.customerOrderId : null);
                          return base ? `[#${base.orderId || base._id?.substring(0, 6)}] ${base.customerId?.name || 'Unknown'}` : 'No Order Linked';
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(() => {
                          const base = customerOrders.find(o => o._id === form.customerOrderId) || (editing?.customerOrderId && typeof editing.customerOrderId === 'object' ? editing.customerOrderId : null);
                          return base?.issue || 'No issue description';
                        })()}
                      </p>
                    </div>
                    <div className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded font-bold uppercase">Auto-linked</div>
                  </div>
                </div>

                {/* Issue Field - Dedicated */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Detailed Issue</label>
                  <div className="text-sm font-medium p-3 bg-white border border-gray-200 rounded-lg min-h-[40px]">
                    {(() => {
                      const base = customerOrders.find(o => o._id === form.customerOrderId) || (editing?.customerOrderId && typeof editing.customerOrderId === 'object' ? editing.customerOrderId : null);
                      return base?.issue || '-';
                    })()}
                  </div>
                </div>

                {/* Technician (From CS) vs Maintenance Engineer */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Technician (From Customer Order)</label>
                  <div className="text-sm font-semibold p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg text-amber-900">
                    {(() => {
                      const base = customerOrders.find(o => o._id === form.customerOrderId) || (editing?.customerOrderId && typeof editing.customerOrderId === 'object' ? editing.customerOrderId : null);
                      const tech = base?.technicianId;
                      return tech ? (typeof tech === 'object' ? (tech.fullName || tech.name) : tech) : 'Not assigned by CS';
                    })()}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Maintenance Engineer</label>
                  {effectivelyReadOnly ? (
                    <div className="text-sm font-semibold p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-900">
                      {form.maintenanceEngineer || 'Not Assigned'}
                    </div>
                  ) : (
                    <Select
                      value={form.maintenanceEngineer}
                      onChange={u('maintenanceEngineer')}
                    >
                      <option value="">Select Engineer</option>
                      {engineers.map(eng => (
                        <option key={eng._id} value={eng.fullName || eng.name}>
                          {eng.fullName || eng.name} ({eng.role})
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>

              {/* SECTION: Timeline & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Task Date */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Task Date</label>
                  {effectivelyReadOnly ? (
                    <div className="text-sm font-medium p-2 bg-gray-50 border border-gray-200 rounded-lg">{form.taskDate || '-'}</div>
                  ) : (
                    <Input type="date" value={form.taskDate} onChange={u('taskDate')} />
                  )}
                </div>

                {/* Start Maint Date */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Start Maint.</label>
                  {effectivelyReadOnly ? (
                    <div className="text-sm font-medium p-2 bg-gray-50 border border-gray-200 rounded-lg">{form.startMaintenanceDate || '-'}</div>
                  ) : (
                    <Input type="date" value={form.startMaintenanceDate} onChange={u('startMaintenanceDate')} />
                  )}
                </div>

                {/* End Maint Date */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">End Maint.</label>
                  {effectivelyReadOnly ? (
                    <div className="text-sm font-medium p-2 bg-gray-50 border border-gray-200 rounded-lg">{form.endMaintenanceDate || '-'}</div>
                  ) : (
                    <Input type="date" value={form.endMaintenanceDate} onChange={u('endMaintenanceDate')} />
                  )}
                </div>

                {/* Punctuality */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Punctuality</label>
                  {effectivelyReadOnly ? (
                    <div className={`text-sm font-bold p-2 rounded-lg border ${form.punctuality === 'Same time' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                      {form.punctuality || '-'}
                    </div>
                  ) : (
                    <Select value={form.punctuality} onChange={u('punctuality')}>
                      <option value="">Select Punctuality</option>
                      {PUNCTUALITIES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </Select>
                  )}
                </div>

                {/* Task Completed */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Task Completed</label>
                  {effectivelyReadOnly ? (
                    <div className={`text-sm font-bold p-2 rounded-lg border ${form.taskCompleted === 'Yes' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                      {form.taskCompleted || '-'}
                    </div>
                  ) : (
                    <Select value={form.taskCompleted} onChange={u('taskCompleted')}>
                      <option value="">Select Status</option>
                      {TASK_COMPLETED.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </Select>
                  )}
                </div>

                {/* Spare Parts Availability */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Spare Parts</label>
                  <div className={`text-sm font-bold p-2 rounded-lg border ${form.sparePartsAvailability === 'Available' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                    {form.sparePartsAvailability || 'Not Needed'}
                    <span className="ml-1 text-[10px] opacity-70">(Auto)</span>
                  </div>
                </div>
              </div>

              {/* Conditional Reasons */}
              {(form.punctuality === 'Late' || form.taskCompleted === 'No') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  {form.punctuality === 'Late' && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-amber-600 uppercase tracking-tight mb-1">Reason for Delay</label>
                      {effectivelyReadOnly ? (
                        <div className="text-sm p-2 bg-amber-50 border border-amber-100 rounded-lg">{form.reasonForDelay || '-'}</div>
                      ) : (
                        <Input placeholder="Reason for delay" value={form.reasonForDelay} onChange={u('reasonForDelay')} />
                      )}
                    </div>
                  )}
                  {form.taskCompleted === 'No' && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-red-600 uppercase tracking-tight mb-1">Reason for Incompletion</label>
                      {effectivelyReadOnly ? (
                        <div className="text-sm p-2 bg-red-50 border border-red-100 rounded-lg">{form.reasonForIncompletion || '-'}</div>
                      ) : (
                        <Input placeholder="Reason for incompletion" value={form.reasonForIncompletion} onChange={u('reasonForIncompletion')} />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Rating */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-3 text-center">Customer Satisfaction Rating</label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-8 w-8 ${star <= parseInt(form.rating || '0') ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                    />
                  ))}
                  <div className="ml-4 px-3 py-1 bg-white border border-gray-200 rounded-full text-sm font-bold shadow-sm">
                    {form.rating || '0'} / 5
                    {feedbackFound && <span className="ml-1 text-[10px] text-green-600 font-black tracking-tighter">AUTO</span>}
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
                            value={part.InventoryItemId}
                            onChange={(e) => updatePart(part.id, 'InventoryItemId', e.target.value)}
                            disabled={effectivelyReadOnly}
                          >
                            <option value="">Select Part</option>
                            {Inventory.map(item => (
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



