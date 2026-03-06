'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Wrench, X } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import { columns, WorkOrder } from './columns';
import toast from 'react-hot-toast';

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

const PUNCTUALITIES = ['Same time', 'Late'];
const TASK_COMPLETED = ['Yes', 'No'];
const SPARE_PARTS_AVAILABILITY = ['Available', 'Not Available', 'Requested'];

type FormData = {
  maintenanceEngineer: string;
  taskDate: string;
  startMaintenanceDate: string;
  endMaintenanceDate: string;
  punctuality: string;
  reasonForDelay: string;
  taskCompleted: string;
  reasonForIncompletion: string;
  rating: string;
  sparePartsId: string;
  sparePartsAvailability: string;
  notes: string;
};

const blank: FormData = {
  maintenanceEngineer: '',
  taskDate: '',
  startMaintenanceDate: '',
  endMaintenanceDate: '',
  punctuality: '',
  reasonForDelay: '',
  taskCompleted: '',
  reasonForIncompletion: '',
  rating: '',
  sparePartsId: '',
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
  const lim = 10;
  const tp = Math.ceil(total / lim);

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
    setForm({
      maintenanceEngineer: r.maintenanceEngineer || '',
      taskDate: r.taskDate ? r.taskDate.split('T')[0] : '',
      startMaintenanceDate: r.startMaintenanceDate ? r.startMaintenanceDate.split('T')[0] : '',
      endMaintenanceDate: r.endMaintenanceDate ? r.endMaintenanceDate.split('T')[0] : '',
      punctuality: r.punctuality || '',
      reasonForDelay: r.reasonForDelay || '',
      taskCompleted: r.taskCompleted || '',
      reasonForIncompletion: r.reasonForIncompletion || '',
      rating: r.rating || '',
      sparePartsId: r.sparePartsId || '',
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

    try {
      if (editing) {
        await api.put(`/operations/work-order/${editing._id}`, pl);
        toast.success('Work order updated successfully');
      }
      setModal(false);
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
          onPageChange={setPage}
          bulkDeleteEndpoint="/operations/work-order/bulk-delete"
          onBulkDeleteSuccess={fetch_}
          meta={{
            onEdit: openE,
            onDelete: (id: string) => setDelId(id),
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
              <div className="grid grid-cols-2 gap-4">
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

                {/* Spare Parts ID */}
                <div>
                  <label className="block text-sm font-medium mb-1">Spare Parts ID</label>
                  <input
                    placeholder="Spare Parts ID"
                    value={form.sparePartsId}
                    onChange={u('sparePartsId')}
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
                  onClick={() => setModal(false)}
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
