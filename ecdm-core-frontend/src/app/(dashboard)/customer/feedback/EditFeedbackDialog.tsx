'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  solvedIssue: z.enum(['Yes', 'No', '']).optional(),
  followUp: z.enum(['Yes', 'No', '']).optional(),
  ratingOperation: z.string().optional(),
  ratingCustomerService: z.string().optional(),
  notes: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

interface Customer {
  _id?: string;
  customerId?: string;
  name?: string;
  phone?: string;
}

interface OrderContext {
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  engineerName?: string;
  visitDate?: string;
  scheduledVisitDate?: string;
  actualVisitDate?: string;
  startDate?: string;
  endDate?: string;
  dealStatus?: string;
  orderId?: string;
}

interface CustomerOrder {
  _id?: string;
  engineerName?: string;
  actualVisitDate?: string;
  startDate?: string;
  endDate?: string;
}

interface Feedback {
  _id: string;
  customerId?: Customer | string;
  customerOrderId?: CustomerOrder | string;
  orderContext?: OrderContext;
  solvedIssue?: string;
  followUp?: string;
  ratingOperation?: string;
  ratingCustomerService?: string;
  notes?: string;
  createdAt?: string;
}

interface EditFeedbackDialogProps {
  feedback?: Feedback;
  isNew?: boolean;
  prefillData?: {
    customerId: string;
    customerOrderId: string;
    orderContext: OrderContext;
  };
  onClose: () => void;
  onSuccess: () => void;
  readOnly?: boolean;
}

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';
const readOnlyCls = 'text-sm px-3 py-2 bg-[hsl(var(--background))] rounded-md border border-[hsl(var(--border))] font-medium';

const formatDate = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return '-';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return day + '/' + month + '/' + year;
  } catch {
    return '-';
  }
};

export default function EditFeedbackDialog({ feedback, isNew, prefillData, onClose, onSuccess, readOnly = false }: EditFeedbackDialogProps) {
  const [internalPreviewMode, setInternalPreviewMode] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const effectivelyReadOnly = readOnly || (internalPreviewMode && !isNew);

  const orderContext = (feedback?.orderContext || prefillData?.orderContext) as OrderContext || {};
  const customer = (feedback?.customerId as Customer) || (prefillData?.customerId ? { _id: prefillData.customerId } : undefined);
  const order = feedback?.customerOrderId as CustomerOrder || (prefillData?.customerOrderId ? { _id: prefillData.customerOrderId } : undefined);

  const getContextValue = (key: keyof OrderContext): string => {
    return orderContext[key] || '-';
  };

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      solvedIssue: feedback?.solvedIssue as 'Yes' | 'No' | '' || '',
      followUp: feedback?.followUp as 'Yes' | 'No' | '' || '',
      ratingOperation: feedback?.ratingOperation || '',
      ratingCustomerService: feedback?.ratingCustomerService || '',
      notes: feedback?.notes || '',
    },
  });

  const onSubmit = async (values: FormSchema) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      if (values.solvedIssue !== undefined) payload.solvedIssue = values.solvedIssue;
      if (values.followUp !== undefined) payload.followUp = values.followUp;
      if (values.ratingOperation !== undefined) payload.ratingOperation = values.ratingOperation;
      if (values.ratingCustomerService !== undefined) payload.ratingCustomerService = values.ratingCustomerService;
      if (values.notes !== undefined) payload.notes = values.notes;

      if (isNew && prefillData) {
        payload.customerId = prefillData.customerId;
        payload.customerOrderId = prefillData.customerOrderId;
        await api.post('/customer/feedback', payload);
        toast.success('Feedback created successfully!');
      } else if (feedback) {
        await api.put(`/customer/feedback/${feedback._id}`, payload);
        toast.success('Feedback updated successfully!');
      }
      
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save feedback:', err);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save feedback';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const onError = (errors: unknown) => {
    if (errors && Object.keys(errors as object).length > 0) {
      console.error('Form validation errors:', errors);
      toast.error('Please check the form for errors.');
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isNew ? 'Create Feedback' : (effectivelyReadOnly ? 'Feedback Preview' : 'Edit Feedback')}
          </DialogTitle>
          {!isNew && feedback && (
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium mt-0.5">
              Feedback ID: {feedback._id}
              {effectivelyReadOnly && <span className="ml-2 text-amber-600 font-semibold">• Preview Mode</span>}
            </p>
          )}
        </DialogHeader>

        <DialogBody>
          <form id="edit-feedback-form" onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="h-1 w-1 rounded-full bg-gray-400"></div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Section A: Order Context (Read-Only)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1 block">Customer Name</label>
                  <div className={readOnlyCls}>{getContextValue('customerName') || customer?.name || '-'}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1 block">Phone Number</label>
                  <div className={readOnlyCls}>{getContextValue('customerPhone') || customer?.phone || '-'}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1 block">Customer ID</label>
                  <div className={`${readOnlyCls} font-mono text-xs text-gray-400`}>{getContextValue('customerId') || customer?.customerId || customer?._id || '-'}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1 block">Engineer Name</label>
                  <div className={readOnlyCls}>{getContextValue('engineerName') || '-'}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1 block">Actual Visit Date</label>
                  <div className={readOnlyCls}>{formatDate(getContextValue('actualVisitDate') || getContextValue('visitDate'))}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1 block">Deal Status</label>
                  <div className={readOnlyCls}>{getContextValue('dealStatus') || '-'}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="h-1 w-1 rounded-full bg-primary"></div>
                <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  Section B: Feedback Ratings (Editable)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelCls}>Solved Issue?</label>
                  <select {...form.register('solvedIssue')} className={iCls} disabled={effectivelyReadOnly}>
                    <option value="">Not Set</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>Follow Up Required?</label>
                  <select {...form.register('followUp')} className={iCls} disabled={effectivelyReadOnly}>
                    <option value="">Not Set</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>Operation Rating</label>
                  <input type="text" placeholder="e.g., 5/5, Excellent" {...form.register('ratingOperation')} className={iCls} disabled={effectivelyReadOnly} />
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>Support Rating</label>
                  <input type="text" placeholder="e.g., 5/5, Excellent" {...form.register('ratingCustomerService')} className={iCls} disabled={effectivelyReadOnly} />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Customer Notes</label>
                <textarea
                  placeholder="Additional feedback details..."
                  {...form.register('notes')}
                  rows={4}
                  disabled={effectivelyReadOnly}
                  className="flex min-h-[100px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
                />
              </div>
            </div>
          </form>
        </DialogBody>

        <DialogFooter className="bg-white/50 backdrop-blur-md border-t border-[hsl(var(--border))]/30">
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {effectivelyReadOnly ? 'Close' : 'Cancel'}
            </Button>
            {effectivelyReadOnly ? (
              <Button
                type="button"
                key="btn-edit" onClick={(e) => { e.preventDefault(); setInternalPreviewMode(false); }}
                className="flex-1 px-8 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 transition-all shadow-md active:scale-95"
              >
                Edit Feedback
              </Button>
            ) : (
              <Button
                type="submit"
                form="edit-feedback-form"
                disabled={saving}
                className="protect-mount flex-1 px-8 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 transition-all shadow-md active:scale-95"
              >
                {saving ? 'Saving...' : isNew ? 'Create Feedback' : 'Save Changes'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
