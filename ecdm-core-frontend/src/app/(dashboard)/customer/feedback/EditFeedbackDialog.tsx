'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
}

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed';
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

export default function EditFeedbackDialog({ feedback, isNew, prefillData, onClose, onSuccess }: EditFeedbackDialogProps) {
  const [saving, setSaving] = useState(false);

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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-6 outline-none">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--border))] pb-4 mb-4 space-y-0">
          <div>
            <DialogTitle className="text-xl font-bold">
              {isNew ? 'Create Feedback' : 'Edit Feedback'}
            </DialogTitle>
            {!isNew && feedback && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Feedback ID: {feedback._id}
              </p>
            )}
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
                <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Order ID</label>
                <div className={`${readOnlyCls} font-mono text-xs`}>
                  {getContextValue('orderId') || order?._id || '-'}
                </div>
              </div>
              <div>
                <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Engineer Name</label>
                <div className={readOnlyCls}>
                  {getContextValue('engineerName') || '-'}
                </div>
              </div>
              <div>
                <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Visit Date</label>
                <div className={readOnlyCls}>
                  {formatDate(getContextValue('actualVisitDate') || getContextValue('visitDate'))}
                </div>
              </div>
              <div>
                <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">Start Date</label>
                <div className={readOnlyCls}>
                  {formatDate(getContextValue('startDate'))}
                </div>
              </div>
              <div>
                <label className="text-[hsl(var(--muted-foreground))] text-xs mb-1 block">End Date</label>
                <div className={readOnlyCls}>
                  {formatDate(getContextValue('endDate'))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Section B: Feedback Ratings (Editable)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Solved Issue</label>
                <select {...form.register('solvedIssue')} className={iCls}>
                  <option value="">Not Set</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Follow Up Required</label>
                <select {...form.register('followUp')} className={iCls}>
                  <option value="">Not Set</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Rating Operation</label>
                <input
                  type="text"
                  placeholder="e.g., Excellent, Good, 5/5"
                  {...form.register('ratingOperation')}
                  className={iCls}
                />
              </div>

              <div>
                <label className={labelCls}>Rating Customer Service</label>
                <input
                  type="text"
                  placeholder="e.g., Excellent, Good, 5/5"
                  {...form.register('ratingCustomerService')}
                  className={iCls}
                />
              </div>

              <div className="col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea
                  placeholder="Enter notes..."
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
                <p key={field} className="text-xs"> {field}: {(error as { message?: string })?.message || 'Invalid value'}</p>
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
              {saving ? 'Saving...' : isNew ? 'Create Feedback' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
