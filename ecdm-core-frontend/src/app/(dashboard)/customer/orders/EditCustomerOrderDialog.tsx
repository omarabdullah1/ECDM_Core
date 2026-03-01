'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { CustomerOrder } from './columns';

/**
 * Edit Customer Order Dialog - Operational Fields Only
 * 
 * Architecture:
 * - Section A: Context (Read-Only) - Customer Name, Scheduled Visit Date, Type of Order, Issue
 * - Section B: Operational (Editable) - Engineer Name, Dates, Pickup Type, Deal, Cost, Notes
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface EditCustomerOrderDialogProps {
  order: CustomerOrder;
  onClose: () => void;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schema - Editable Fields Only
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  engineerName: z.string().optional(),
  actualVisitDate: z.string().optional(),
  devicePickupType: z.string().optional(), // 'Customer Drop-off', 'Company Pickup', 'On-site Repair'
  deal: z.string().optional(), // 'Pending', 'Approved', 'Rejected', 'Done'
  cost: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  deviceReturnedDate: z.string().optional(),
  notes: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEVICE_PICKUP_TYPES = ['Customer Drop-off', 'Company Pickup', 'On-site Repair'];
const DEAL_STATUSES = ['Pending', 'Approved', 'Rejected', 'Done'];

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';
const readOnlyCls = 'text-sm px-3 py-2 bg-[hsl(var(--muted))]/30 rounded-lg border border-[hsl(var(--border))]';

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert ISO date string to datetime-local input format: YYYY-MM-DDTHH:mm
 */
const toDateTimeLocal = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
};

/**
 * Convert ISO date string to date input format: YYYY-MM-DD
 */
const toDateLocal = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

/**
 * Format date for display: dd/MM/yyyy HH:mm
 */
const formatDateDisplay = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '-';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function EditCustomerOrderDialog({ order, onClose, onSuccess }: EditCustomerOrderDialogProps) {
  const [saving, setSaving] = useState(false);

  // Initialize react-hook-form with Zod validation
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      engineerName: order.engineerName || '',
      actualVisitDate: toDateTimeLocal(order.actualVisitDate),
      devicePickupType: order.devicePickupType || '',
      deal: order.deal || 'Pending',
      cost: Number(order.cost) || undefined,
      startDate: toDateLocal(order.startDate),
      endDate: toDateLocal(order.endDate),
      deviceReturnedDate: toDateLocal(order.deviceReturnedDate),
      notes: order.notes || '',
    },
  });

  // ─── Error Handler (Catches Validation Errors) ─────────────────────────────
  const onError = (errors: any) => {
    // Only show error if there are actual validation errors
    if (errors && Object.keys(errors).length > 0) {
      console.error('❌ Form Validation Errors:', errors);
      toast.error('Please fill in all required fields correctly.');
    }
  };

  // ─── Submit Handler (API Request) ──────────────────────────────────────────
  const onSubmit = async (values: FormSchema) => {
    console.log('✅ Form validation passed. Submitting:', values);
    setSaving(true);

    try {
      // Prepare payload
      const payload: Record<string, unknown> = {};

      // String fields
      if (values.engineerName !== undefined) {
        payload.engineerName = values.engineerName;
      }
      if (values.devicePickupType !== undefined && values.devicePickupType !== '') {
        payload.devicePickupType = values.devicePickupType;
      }
      if (values.deal !== undefined && values.deal !== '') {
        payload.deal = values.deal;
      }
      if (values.notes !== undefined) {
        payload.notes = values.notes;
      }

      // Number field - ensure it's converted to number
      if (values.cost !== undefined) {
        payload.cost = Number(values.cost) || 0;
      }

      // Date fields - Convert to ISO
      const dateFields: Array<keyof FormSchema> = [
        'actualVisitDate',
        'startDate',
        'endDate',
        'deviceReturnedDate',
      ];

      dateFields.forEach((field) => {
        const value = values[field];
        if (value && value !== '') {
          try {
            payload[field] = new Date(value as string).toISOString();
            console.log(`✓ Date → ISO [${field}]:`, payload[field]);
          } catch (err) {
            console.warn(`⚠️ Invalid date for ${field}:`, value);
          }
        }
      });

      console.log('📦 Payload:', payload);

      // Make API call
      await api.put(`/customer/orders/${order._id}`, payload);

      console.log('✅ Order updated successfully');
      toast.success('Customer order updated successfully!');

      // Close dialog and trigger refresh
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('❌ API Error:', err);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to update order';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Extract Upstream Data (Read-Only) ──────────────────────────────────────
  const customer = order.customerId;
  const customerName = customer?.name || '-';
  const scheduledVisit = formatDateDisplay(order.scheduledVisitDate);
  const typeOfOrder = order.typeOfOrder || '-';
  const issue = order.issue || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl my-8">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 sticky top-0 bg-[hsl(var(--card))] z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold">Edit Customer Order</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Order ID: {order._id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit, onError)}>
          <div className="px-6 py-6 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* ═══════════════════════════════════════════════════════════════
                SECTION A: Context (READ-ONLY)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--muted-foreground))]"></div>
                <h3 className="text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Section A: Context (Read-Only)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))]/20 rounded-xl border border-[hsl(var(--border))]/50">
                <div>
                  <label className={labelCls}>Customer Name</label>
                  <div className={readOnlyCls}>{customerName}</div>
                </div>

                <div>
                  <label className={labelCls}>Scheduled Visit Date</label>
                  <div className={readOnlyCls}>{scheduledVisit}</div>
                </div>

                <div>
                  <label className={labelCls}>Type of Order</label>
                  <div className={readOnlyCls}>{typeOfOrder}</div>
                </div>

                <div>
                  <label className={labelCls}>Issue</label>
                  <div className={readOnlyCls} title={issue}>{issue}</div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION B: Operational (EDITABLE)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--primary))]"></div>
                <h3 className="text-sm font-bold text-[hsl(var(--primary))] uppercase tracking-wider">
                  Section B: Operational (Editable)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Engineer Name */}
                <div>
                  <label className={labelCls}>Engineer Name</label>
                  <input
                    type="text"
                    placeholder="Enter engineer name..."
                    {...form.register('engineerName')}
                    className={iCls}
                  />
                </div>

                {/* Actual Visit Date */}
                <div>
                  <label className={labelCls}>Actual Visit Date</label>
                  <input
                    type="datetime-local"
                    {...form.register('actualVisitDate')}
                    className={iCls}
                  />
                </div>

                {/* Device Pickup Type */}
                <div>
                  <label className={labelCls}>Device Pickup Type</label>
                  <select {...form.register('devicePickupType')} className={iCls}>
                    <option value="">Select pickup type...</option>
                    {DEVICE_PICKUP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deal Status */}
                <div>
                  <label className={labelCls}>Deal Status</label>
                  <select {...form.register('deal')} className={iCls}>
                    <option value="">Select status...</option>
                    {DEAL_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cost */}
                <div>
                  <label className={labelCls}>Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...form.register('cost')}
                    className={iCls}
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input
                    type="date"
                    {...form.register('startDate')}
                    className={iCls}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className={labelCls}>End Date</label>
                  <input
                    type="date"
                    {...form.register('endDate')}
                    className={iCls}
                  />
                </div>

                {/* Device Returned Date */}
                <div>
                  <label className={labelCls}>Device Returned Date</label>
                  <input
                    type="date"
                    {...form.register('deviceReturnedDate')}
                    className={iCls}
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className={labelCls}>Notes</label>
                  <textarea
                    placeholder="Additional notes..."
                    {...form.register('notes')}
                    rows={4}
                    className={iCls}
                  />
                </div>
              </div>
            </div>

            {/* Error Display */}
            {form.formState.errors &&
              Object.keys(form.formState.errors).length > 0 && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-2">
                  <p className="font-semibold">Please correct the following errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(form.formState.errors).map(([field, error]: [string, any]) => (
                      <li key={field}>
                        <span className="font-medium">{field}:</span> {error?.message || 'Invalid value'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>

          {/* ─── Footer Actions ─────────────────────────────────────────────── */}
          <div className="flex gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 rounded-b-2xl sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[hsl(var(--border))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
