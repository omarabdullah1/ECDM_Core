'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { CustomerOrder } from './columns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';

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
  readOnly?: boolean;
  initialEditMode?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schema - Editable Fields Only
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  technicianId: z.string().optional(),
  technicianName: z.string().optional(),
  actualVisitDate: z.string().optional(),
  devicePickupType: z.string().optional(), // 'Customer Drop-off', 'Company Pickup', 'On-site Repair'
  deal: z.string().optional(), // 'Pending', 'Approved', 'Rejected', 'Done'
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

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';
const readOnlyCls = 'text-sm px-3 py-2 bg-[hsl(var(--muted))]/30 rounded-lg border border-[hsl(var(--border))]';
const historyLabelCls = 'text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1 block';
const historyValueCls = 'text-sm px-2.5 py-1.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-md border border-amber-200/60 dark:border-amber-800/40 text-[hsl(var(--foreground))]';

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

export default function EditCustomerOrderDialog({ order, onClose, onSuccess, readOnly = false, initialEditMode = false }: EditCustomerOrderDialogProps) {
  const [internalPreviewMode, setInternalPreviewMode] = useState(!initialEditMode);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  useEffect(() => {
    if (order) {
      setInternalPreviewMode(!initialEditMode);
    }
  }, [order, initialEditMode]);
  const [saving, setSaving] = useState(false);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loadingEngineers, setLoadingEngineers] = useState(false);

  const effectivelyReadOnly = readOnly || internalPreviewMode;

  // Initialize react-hook-form with Zod validation
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      technicianId: order.technicianId || '',
      technicianName: order.technicianName || '',
      actualVisitDate: toDateTimeLocal(order.actualVisitDate),
      devicePickupType: order.devicePickupType || '',
      deal: order.deal || 'Pending',
      startDate: toDateLocal(order.startDate),
      endDate: toDateLocal(order.endDate),
      deviceReturnedDate: toDateLocal(order.deviceReturnedDate),
      notes: order.notes || '',
    },
  });

  // ─── Fetch Engineers ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEngineers = async () => {
      setLoadingEngineers(true);
      try {
        const { data } = await api.get('/hr/users', {
          params: { limit: 1000, isActive: true }
        });
        // Filter for technicians/engineers
        const engineerList = data.data.data.filter((employee: any) => 
          employee.role === 'Technician' ||
          employee.role === 'MaintenanceEngineer' || 
          employee.department?.toLowerCase().includes('technician') ||
          employee.department?.toLowerCase().includes('engineer')
        );
        setEngineers(engineerList);
      } catch (error) {
        console.error('Failed to fetch engineers:', error);
        toast.error('Failed to load engineers');
      } finally {
        setLoadingEngineers(false);
      }
    };

    fetchEngineers();
  }, []);

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

      // Technician fields - send both ID (relational) and Name (denormalized for display)
      if (values.technicianId !== undefined) {
        payload.technicianId = values.technicianId === '' ? null : values.technicianId;
        // Also update denormalized technicianName for display purposes
        const selectedTechnician = engineers.find(e => e._id === values.technicianId);
        if (selectedTechnician) {
          payload.technicianName = `${selectedTechnician.firstName} ${selectedTechnician.lastName}`;
        } else if (values.technicianName && values.technicianId !== '') {
          payload.technicianName = values.technicianName;
        } else if (values.technicianId === '') {
          payload.technicianName = '';
        }
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

      const dateFields: Array<keyof FormSchema> = ['actualVisitDate', 'startDate', 'deviceReturnedDate'];
      dateFields.forEach((field) => {
        const value = values[field];
        if (value && value !== '') {
          try { payload[field] = new Date(value as string).toISOString(); } catch {}
        }
      });

      await api.put(`/customer/orders/${order._id}`, payload);
      toast.success('Customer order updated successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const customer = order.customerId;
  const customerName = customer?.name || '-';
  const scheduledVisit = formatDateDisplay(order.scheduledVisitDate);
  const typeOfOrder = order.typeOfOrder || '-';
  const issue = order.issue || '-';
  const quotationTotal = order.salesOrderId?.quotation?.grandTotal;
  const finalCost = quotationTotal !== undefined ? quotationTotal : order.cost;
  const displayCost = finalCost !== undefined && finalCost > 0 ? `EGP ${Number(finalCost).toFixed(2)}` : '-';

  // ─── Sales Order History Data ────────────────────────────────────────────
  const so = order.salesOrderId as any;
  const soSalesPerson = so?.salesPerson
    ? `${so.salesPerson.firstName || ''} ${so.salesPerson.lastName || ''}`.trim() || so.salesPerson.email
    : (so?.salesLead?.salesPerson
      ? `${so.salesLead.salesPerson.firstName || ''} ${so.salesLead.salesPerson.lastName || ''}`.trim()
      : (so?.salesData?.salesPerson
        ? `${so.salesData.salesPerson.firstName || ''} ${so.salesData.salesPerson.lastName || ''}`.trim()
        : '-'));
  const soSource = so?.salesLead ? 'Sales Lead (Inbound)' : so?.salesData ? 'Sales Data (Cold Call)' : '-';
  const soInitialIssue = so?.salesLead?.issue || so?.salesData?.issue || so?.issueDescription || '-';
  const soSourceStatus = so?.salesLead?.status || so?.salesData?.callOutcome || '-';
  const soSourceNotes = so?.salesLead?.notes || so?.salesData?.notes || '-';
  const soCreatedAt = so?.createdAt ? formatDateDisplay(so.createdAt) : '-';
  const soQuotationItems = so?.quotation?.items?.length
    ? so.quotation.items.map((i: any) => `${i.quantity}x ${i.description} @ EGP ${Number(i.unitPrice).toFixed(2)}`)
    : [];
  const hasSalesOrderHistory = !!so;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{effectivelyReadOnly ? 'Customer Order Preview' : 'Edit Customer Order'}</DialogTitle>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium mt-0.5">
            Order ID: {order._id}
            {effectivelyReadOnly && <span className="ml-2 text-amber-600 font-semibold">• Preview Mode</span>}
          </p>
        </DialogHeader>

        <DialogBody>
          <form id="edit-customer-order-form" onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="h-1 w-1 rounded-full bg-gray-400"></div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Section A: Context (Read-Only)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                <div>
                  <label className={labelCls}>Customer Name</label>
                  <div className={readOnlyCls}>{customerName}</div>
                </div>
                <div>
                  <label className={labelCls}>Scheduled Visit</label>
                  <div className={readOnlyCls}>{scheduledVisit}</div>
                </div>
                <div>
                  <label className={labelCls}>Order Type</label>
                  <div className={readOnlyCls}>{typeOfOrder}</div>
                </div>
                <div>
                  <label className={labelCls}>Total Cost</label>
                  <div className={readOnlyCls}>{displayCost}</div>
                </div>

                <div className="col-span-2">
                  <label className={labelCls}>Inquiry Issue</label>
                  <div className={readOnlyCls}>{issue}</div>
                </div>
              </div>
            </div>

            {/* ── Section C: Sales Order History (always read-only) ── */}
            {hasSalesOrderHistory && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setHistoryExpanded(v => !v)}
                  className="flex items-center gap-2 w-full pb-2 border-b border-amber-200/60 dark:border-amber-800/40 hover:opacity-80 transition-opacity"
                >
                  <History className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <h3 className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest flex-1 text-left">
                    Section C: Sales Order History (Read-Only)
                  </h3>
                  {historyExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-amber-500" />
                    : <ChevronRight className="h-3.5 w-3.5 text-amber-500" />}
                </button>

                {historyExpanded && (
                  <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10 p-4 space-y-4">

                    {/* Row 1: Order ID + Source */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className={historyLabelCls}>Sales Order ID</span>
                        <div className={historyValueCls}>{so?.salesOrderId || '-'}</div>
                      </div>
                      <div>
                        <span className={historyLabelCls}>Source</span>
                        <div className={historyValueCls}>{soSource}</div>
                      </div>
                    </div>

                    {/* Row 2: Type + Platform */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className={historyLabelCls}>Order Type</span>
                        <div className={historyValueCls}>{so?.typeOfOrder || '-'}</div>
                      </div>
                      <div>
                        <span className={historyLabelCls}>Sales Platform</span>
                        <div className={historyValueCls}>{so?.salesPlatform || '-'}</div>
                      </div>
                    </div>

                    {/* Row 3: Salesperson + Order Status */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className={historyLabelCls}>Sales Person</span>
                        <div className={historyValueCls}>{soSalesPerson}</div>
                      </div>
                      <div>
                        <span className={historyLabelCls}>Order Status</span>
                        <div className={historyValueCls}>{so?.orderStatus || so?.finalStatus || '-'}</div>
                      </div>
                    </div>

                    {/* Row 4: Initial Issue (full width) */}
                    <div>
                      <span className={historyLabelCls}>Initial Issue (from Source)</span>
                      <div className={`${historyValueCls} min-h-[2rem] whitespace-pre-wrap break-words`}>{soInitialIssue}</div>
                    </div>

                    {/* Row 5: Source Status + Source Notes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className={historyLabelCls}>Source Outcome / Status</span>
                        <div className={historyValueCls}>{soSourceStatus}</div>
                      </div>
                      <div>
                        <span className={historyLabelCls}>Source Creation Date</span>
                        <div className={historyValueCls}>{soCreatedAt}</div>
                      </div>
                    </div>

                    {/* Row 6: Source Notes (full width) */}
                    {soSourceNotes !== '-' && (
                      <div>
                        <span className={historyLabelCls}>Source Notes</span>
                        <div className={`${historyValueCls} min-h-[2rem] whitespace-pre-wrap break-words`}>{soSourceNotes}</div>
                      </div>
                    )}

                    {/* Follow-up Statuses */}
                    {(so?.quotationStatusFirstFollowUp || so?.statusSecondFollowUp || so?.finalStatusThirdFollowUp) && (
                      <div className="space-y-2">
                        <span className={historyLabelCls}>Follow-Up Statuses</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[9px] text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wide block mb-0.5">1st Follow-Up</span>
                            <div className={historyValueCls}>{so?.quotationStatusFirstFollowUp || '-'}</div>
                          </div>
                          <div>
                            <span className="text-[9px] text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wide block mb-0.5">2nd Follow-Up</span>
                            <div className={historyValueCls}>{so?.statusSecondFollowUp || '-'}</div>
                          </div>
                          <div>
                            <span className="text-[9px] text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wide block mb-0.5">3rd Follow-Up</span>
                            <div className={historyValueCls}>{so?.finalStatusThirdFollowUp || '-'}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quotation Items */}
                    {soQuotationItems.length > 0 && (
                      <div>
                        <span className={historyLabelCls}>Quotation Items</span>
                        <div className="space-y-1 mt-1">
                          {soQuotationItems.map((item: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm px-2.5 py-1 bg-amber-50/80 dark:bg-amber-950/30 rounded border border-amber-200/50 dark:border-amber-800/30">
                              <span className="text-amber-600 dark:text-amber-400 font-mono text-xs">{idx + 1}.</span>
                              <span>{item}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center px-2.5 py-1.5 bg-amber-100/60 dark:bg-amber-900/20 rounded border border-amber-300/50 dark:border-amber-700/40 mt-1">
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Grand Total</span>
                            <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                              {so?.quotation?.grandTotal ? `EGP ${Number(so.quotation.grandTotal).toFixed(2)}` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="h-1 w-1 rounded-full bg-primary"></div>
                <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  Section B: Operational (Editable)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {so?.isTechnicalInspectionRequired && so?.technicalInspectionDate && (
                  <div className="col-span-2 p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl shadow-sm">
                    <label className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px]">📌</span>
                      Technical Inspection Date (Required)
                    </label>
                    <div className="text-sm font-bold text-indigo-950 dark:text-indigo-200 pl-6">
                      {formatDateDisplay(so.technicalInspectionDate)}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className={labelCls}>Assigned Technician</label>
                  <select {...form.register('technicianId')} className={iCls} disabled={loadingEngineers || effectivelyReadOnly}>
                    <option value="">{loadingEngineers ? 'Loading...' : 'Select Technician...'}</option>
                    {engineers.map((engineer) => (
                      <option key={engineer._id} value={engineer._id}>{engineer.firstName} {engineer.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Actual Visit Date</label>
                  <input type="datetime-local" {...form.register('actualVisitDate')} className={iCls} disabled={effectivelyReadOnly} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Pickup Type</label>
                  <select {...form.register('devicePickupType')} className={iCls} disabled={effectivelyReadOnly}>
                    <option value="">Select type...</option>
                    {DEVICE_PICKUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Deal Status</label>
                  <select {...form.register('deal')} className={iCls} disabled={effectivelyReadOnly}>
                    <option value="">Select status...</option>
                    {DEAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Start Date</label>
                  <input type="date" {...form.register('startDate')} className={iCls} disabled={effectivelyReadOnly} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>End Date (By Operations)</label>
                  <div className={readOnlyCls} style={{ height: '36px' }}>{toDateLocal(order.endDate) || '-'}</div>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Device Returned Date</label>
                  <input type="date" {...form.register('deviceReturnedDate')} className={iCls} disabled={effectivelyReadOnly} />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className={labelCls}>Notes</label>
                  <textarea
                    placeholder="Additional notes..."
                    {...form.register('notes')}
                    rows={4}
                    disabled={effectivelyReadOnly}
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
        </form>
      </DialogBody>
      <DialogFooter>
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[hsl(var(--border))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
          >
            {effectivelyReadOnly ? 'Close' : 'Cancel'}
          </button>
          {effectivelyReadOnly ? (
            !readOnly && (
              <button
                type="button"
                key="btn-edit" onClick={(e) => { e.preventDefault(); setInternalPreviewMode(false); }}
                className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Edit Order
              </button>
            )
          ) : (
            <button
              type="submit"
              form="edit-customer-order-form"
              disabled={saving}
              className="protect-mount flex-1 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
}

