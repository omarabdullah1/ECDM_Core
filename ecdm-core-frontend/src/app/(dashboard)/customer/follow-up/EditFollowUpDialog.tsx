'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { FollowUp } from './columns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const formSchema = z.object({
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
  solvedIssue: z.enum(['Yes', 'No', '']).optional(),
  punctuality: z.enum(['Same Visit Time', 'Late', '']).optional(),
  reasonForDelay: z.string().optional(),
  reasonForNotSolving: z.string().optional(),
  followUp: z.string().optional(),
  status: z.enum(['Pending', 'Contacted', 'Scheduled', 'Completed', 'Canceled']).optional(),
});

type FormSchema = z.infer<typeof formSchema>;

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

interface EditFollowUpDialogProps {
  followUp: FollowUp;
  onClose: () => void;
  onSuccess: () => void;
  onOpenFeedback?: (orderContext: OrderContext, customerOrderId: string, customerId: string) => void;
}

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';
const readOnlyCls = 'text-sm px-3 py-2 bg-[hsl(var(--background))] rounded-md border border-[hsl(var(--border))] font-medium';

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

export default function EditFollowUpDialog({ followUp, onClose, onSuccess, onOpenFeedback }: EditFollowUpDialogProps) {
  const [saving, setSaving] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const [completedStatus, setCompletedStatus] = useState(false);

  const orderContext = (followUp.orderContext as OrderContext) || {};
  const customer = followUp.customer as Record<string, unknown> | undefined;
  const order = followUp.customerOrderId as Record<string, unknown> | undefined;

  const getContextValue = (key: keyof OrderContext): string => {
    return orderContext[key] || '-';
  };

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      followUpDate: toDateLocal(followUp.followUpDate),
      notes: followUp.notes || '',
      solvedIssue: followUp.solvedIssue as 'Yes' | 'No' | '' || '',
      punctuality: followUp.punctuality as 'Same Visit Time' | 'Late' | '' || '',
      reasonForDelay: followUp.reasonForDelay || '',
      reasonForNotSolving: followUp.reasonForNotSolving || '',
      followUp: typeof followUp.followUp === 'boolean'
        ? (followUp.followUp ? 'Yes' : 'No')
        : (followUp.followUp || ''),
      status: followUp.status as 'Pending' | 'Contacted' | 'Scheduled' | 'Completed' | 'Canceled' || 'Pending',
    },
  });

  const onSubmit = async (values: FormSchema) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      if (values.followUpDate) payload.followUpDate = values.followUpDate;
      if (values.notes !== undefined) payload.notes = values.notes;
      if (values.solvedIssue !== undefined) payload.solvedIssue = values.solvedIssue;
      if (values.punctuality !== undefined) payload.punctuality = values.punctuality;
      if (values.reasonForDelay !== undefined) payload.reasonForDelay = values.reasonForDelay;
      if (values.reasonForNotSolving !== undefined) payload.reasonForNotSolving = values.reasonForNotSolving;
      if (values.followUp !== undefined) {
        payload.followUp = values.followUp === 'Yes' ? true : (values.followUp === 'No' ? false : undefined);
      }
      if (values.status !== undefined) payload.status = values.status;

      const previousStatus = followUp.status;
      const isMarkingComplete = values.status === 'Completed' && previousStatus !== 'Completed';

      await api.put(`/customer/follow-up/${followUp._id}`, payload);
      toast.success('Follow up updated successfully!');
      
      if (isMarkingComplete && orderContext.orderId) {
        setCompletedStatus(true);
        setShowFeedbackPrompt(true);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      console.error('Failed to update follow up:', err);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to update follow up';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleFeedbackPrompt = (createFeedback: boolean) => {
    setShowFeedbackPrompt(false);
    if (createFeedback && onOpenFeedback && orderContext.orderId) {
      onOpenFeedback(
        orderContext,
        orderContext.orderId,
        orderContext.customerId || String(customer?._id) || ''
      );
    }
    onSuccess();
    onClose();
  };

  const onError = (errors: unknown) => {
    if (errors && Object.keys(errors as object).length > 0) {
      console.error('Form validation errors:', errors);
      toast.error('Please check the form for errors.');
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-6 outline-none">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--border))] pb-4 mb-4 space-y-0">
            <div>
              <DialogTitle className="text-xl font-bold">Edit Follow Up</DialogTitle>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Follow Up ID: {followUp._id}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
            <div className="mb-6 space-y-4 rounded-lg bg-[hsl(var(--muted))]/50 p-4 border border-[hsl(var(--border))]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Section A: Order Context (Read-Only - Single Source of Truth)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Customer Name</label>
                  <div className={readOnlyCls}>
                    {getContextValue('customerName') || customer?.name || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Phone Number</label>
                  <div className={readOnlyCls}>
                    {getContextValue('customerPhone') || customer?.phone || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Customer ID</label>
                  <div className={`${readOnlyCls} font-mono text-xs`}>
                    {getContextValue('customerId') || customer?.customerId || customer?._id || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Engineer Name</label>
                  <div className={readOnlyCls}>
                    {getContextValue('engineerName') || order?.engineerName || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Visit Date</label>
                  <div className={readOnlyCls}>
                    {formatDate(getContextValue('actualVisitDate') || getContextValue('visitDate') || order?.actualVisitDate)}
                  </div>
                </div>
                <div>
                  <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Deal Status</label>
                  <div className={readOnlyCls}>
                    {getContextValue('dealStatus') || order?.deal || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Start Date</label>
                  <div className={readOnlyCls}>
                    {formatDate(getContextValue('startDate') || order?.startDate)}
                  </div>
                </div>
                <div>
                  <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">End Date</label>
                  <div className={readOnlyCls}>
                    {formatDate(getContextValue('endDate') || order?.endDate)}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Original Issue</label>
                  <div className={`${readOnlyCls} truncate`} title={String(order?.issue || '')}>
                    {order?.issue || '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Section B: Operational (Editable)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Status</label>
                  <select {...form.register('status')} className={iCls}>
                    <option value="Pending">Pending</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Follow Up Date</label>
                  <input
                    type="date"
                    {...form.register('followUpDate')}
                    className={iCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Follow Up</label>
                  <select {...form.register('followUp')} className={iCls}>
                    <option value="">Not Set</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Solved Issue?</label>
                  <select {...form.register('solvedIssue')} className={iCls}>
                    <option value="">Not Set</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Punctuality</label>
                  <select {...form.register('punctuality')} className={iCls}>
                    <option value="">Not Set</option>
                    <option value="Same Visit Time">Same Visit Time</option>
                    <option value="Late">Late</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className={labelCls}>Reason for Delay</label>
                  <input
                    type="text"
                    placeholder="Enter reason if late..."
                    {...form.register('reasonForDelay')}
                    className={iCls}
                  />
                </div>

                <div className="col-span-2">
                  <label className={labelCls}>Reason for Not Solving</label>
                  <textarea
                    placeholder="Enter reason if issue not solved..."
                    {...form.register('reasonForNotSolving')}
                    rows={2}
                    className={iCls}
                  />
                </div>

                <div className="col-span-2">
                  <label className={labelCls}>Follow Up Notes / Action Taken</label>
                  <textarea
                    placeholder="Enter notes or action taken..."
                    {...form.register('notes')}
                    rows={3}
                    className={iCls}
                  />
                </div>
              </div>
            </div>

            {form.formState.errors && Object.keys(form.formState.errors).length > 0 && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-1">
                <p className="font-semibold">Please correct the following errors:</p>
                {Object.entries(form.formState.errors).map(([field, error]: [string, unknown]) => (
                  <p key={field} className="text-xs">• {field}: {(error as { message?: string })?.message || 'Invalid value'}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
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
        </DialogContent>
      </Dialog>

      {showFeedbackPrompt && (
        <Dialog open={true} onOpenChange={() => handleFeedbackPrompt(false)}>
          <DialogContent className="sm:max-w-md p-6 outline-none">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Follow-up Resolved</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                Would you like to log Customer Feedback for this order now?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleFeedbackPrompt(false)}
                  className="flex-1 rounded-xl border border-[hsl(var(--border))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
                >
                  Not Now
                </button>
                <button
                  onClick={() => handleFeedbackPrompt(true)}
                  className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                >
                  Yes, Create Feedback
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
