'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { SalesOrder } from './columns';

/**
 * Edit Sales Order Dialog - CEO-Approved Advanced UX
 * 
 * Features:
 * 1. Conditional Technical Inspection (watch pattern)
 * 2. Quotation File Upload (replaces quotation number)
 * 3. Third Follow-Up Pipeline Guard
 * 
 * Architecture:
 * - Section A: Read-Only Customer & Lead Context (Upstream SSOT)
 * - Section B: Editable Order Progression Fields with Guards
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface EditSalesOrderDialogProps {
  order: SalesOrder;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  salesPlatform: string;
  siteInspectionDate: string;
  isTechnicalInspectionRequired: boolean;
  technicalInspectionDate: string;
  technicalInspectionDetails: string;
  quotationFileUrl: string;
  followUpFirst: string;
  quotationStatusFirstFollowUp: string;
  reasonOfQuotation: string;
  followUpSecond: string;
  statusSecondFollowUp: string;
  followUpThird: string;
  finalStatusThirdFollowUp: string;
  notes: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schema - Validation with Conditional Fields
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  issue: z.string().optional(),
  typeOfOrder: z.string().optional(),
  salesPlatform: z.string().optional(),
  siteInspectionDate: z.string().optional(),
  isTechnicalInspectionRequired: z.boolean(),
  technicalInspectionDate: z.string().optional(), // Optional - only required when checkbox is true
  technicalInspectionDetails: z.string().optional(),
  quotationFile: z.any().optional(), // File upload - accepts File object or undefined
  quotationFileUrl: z.string().optional(),
  followUpFirst: z.string().optional(),
  quotationStatusFirstFollowUp: z.string().optional(),
  reasonOfQuotation: z.string().optional(),
  followUpSecond: z.string().optional(),
  statusSecondFollowUp: z.string().optional(),
  followUpThird: z.string().optional(),
  finalStatusThirdFollowUp: z.string().optional(),
  notes: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const QUOTATION_STATUSES = ['Accepted', 'Rejected', 'Negotiation', 'Pending', 'Expired'];
const FINAL_STATUSES = ['Won', 'Lost', 'Pending'];

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
    // Format: YYYY-MM-DDTHH:mm
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

export default function EditSalesOrderDialog({ order, onClose, onSuccess }: EditSalesOrderDialogProps) {
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize react-hook-form with Zod validation
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      issue: order.issue || '', // STRICTLY the Order Issue
      typeOfOrder: order.typeOfOrder || '',
      // Smart Inheritance: Fallback to Lead/Data values if Order doesn't have them
      salesPlatform: order.salesPlatform || (order.salesLead as any)?.salesPlatform || (order.salesData as any)?.salesPlatform || '',
      siteInspectionDate: toDateTimeLocal(order.siteInspectionDate),
      isTechnicalInspectionRequired: (order as any).isTechnicalInspectionRequired || false,
      technicalInspectionDate: toDateTimeLocal((order as any).technicalInspectionDate),
      technicalInspectionDetails: order.technicalInspectionDetails || '',
      quotationFileUrl: (order as any).quotationFileUrl || '',
      followUpFirst: toDateTimeLocal(order.followUpFirst),
      quotationStatusFirstFollowUp: order.quotationStatusFirstFollowUp || '',
      reasonOfQuotation: order.reasonOfQuotation || '',
      followUpSecond: toDateTimeLocal(order.followUpSecond),
      statusSecondFollowUp: order.statusSecondFollowUp || '',
      followUpThird: toDateTimeLocal(order.followUpThird),
      finalStatusThirdFollowUp: order.finalStatusThirdFollowUp || '',
      notes: order.notes || '',
    },
  });

  // ─── Watch Pattern for Conditional Rendering ────────────────────────────────
  
  // Watch: Technical Inspection Required
  const watchTechnicalInspection = form.watch('isTechnicalInspectionRequired');
  
  // Watch: Reason of Quotation (disabled when Accepted)
  const watchQuotationStatus = form.watch('quotationStatusFirstFollowUp');
  const isReasonDisabled = watchQuotationStatus === 'Accepted';
  
  // Watch: Second Follow-Up Guard (requires first follow-up)
  const watchFollowUpFirst = form.watch('followUpFirst');
  const isFollowUp2Disabled = !watchFollowUpFirst;
  
  // Watch: Third Follow-Up Pipeline Guard (requires second follow-up with status)
  const watchFollowUpSecond = form.watch('followUpSecond');
  const watchStatusSecond = form.watch('statusSecondFollowUp');
  const isFollowUp3Disabled = !watchFollowUpSecond || !watchStatusSecond;

  // Clear dependent fields when toggling technical inspection off
  useEffect(() => {
    if (!watchTechnicalInspection) {
      form.setValue('technicalInspectionDate', '');
      form.setValue('technicalInspectionDetails', '');
    }
  }, [watchTechnicalInspection, form]);

  // ─── Form Handlers ──────────────────────────────────────────────────────────
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setQuotationFile(file);
    form.setValue('quotationFile', file as any);
  };

  // ─── Error Handler (Catches Validation Errors) ─────────────────────────────
  const onError = (errors: any) => {
    console.error('❌ Form Validation Errors:', errors);
    toast.error('Please fill in all required fields correctly.');
  };

  // ─── Submit Handler (API Request with FormData) ────────────────────────────
  const onSubmit = async (values: FormSchema) => {
    console.log('✅ Form validation passed. Submitting:', values);
    setSaving(true);

    try {
      // Use FormData for file upload with explicit type handling
      const formData = new FormData();
      
      // ─────────────────────────────────────────────────────────────────────────
      // Systematically append all string fields
      // ─────────────────────────────────────────────────────────────────────────
      const stringFields = [
        'issue',
        'salesPlatform', 
        'technicalInspectionDetails', 
        'reasonOfQuotation', 
        'notes'
      ];
      
      stringFields.forEach(field => {
        const value = values[field as keyof FormSchema];
        // Append if value exists (including empty strings to allow clearing fields)
        if (value !== undefined && value !== null) {
          formData.append(field, String(value));
          console.log(`✓ Appending [${field}]:`, String(value) || '(empty string)');
        }
      });

      // ─────────────────────────────────────────────────────────────────────────
      // Type of Order: Append if selected (allow empty string to clear)
      // ─────────────────────────────────────────────────────────────────────────
      if (values.typeOfOrder !== undefined) {
        formData.append('typeOfOrder', values.typeOfOrder || '');
        console.log(`✓ Appending [typeOfOrder]:`, values.typeOfOrder || '(empty)');
      }

      // ─────────────────────────────────────────────────────────────────────────
      // Enum fields: Only append if they have actual values (not empty strings)
      // Empty strings would fail Zod enum validation
      // ─────────────────────────────────────────────────────────────────────────
      const enumFields = [
        'quotationStatusFirstFollowUp',
        'statusSecondFollowUp',
        'finalStatusThirdFollowUp'
      ];
      
      enumFields.forEach(field => {
        const value = values[field as keyof FormSchema];
        // Only append if value exists AND is not an empty string
        if (value && value !== '') {
          formData.append(field, String(value));
          console.log(`✓ Appending enum [${field}]:`, String(value));
        }
      });

      // ─────────────────────────────────────────────────────────────────────────
      // Explicitly handle Boolean: isTechnicalInspectionRequired
      // ─────────────────────────────────────────────────────────────────────────
      if (values.isTechnicalInspectionRequired !== undefined) {
        formData.append('isTechnicalInspectionRequired', String(values.isTechnicalInspectionRequired));
        console.log('✓ Boolean → String:', {
          isTechnicalInspectionRequired: String(values.isTechnicalInspectionRequired)
        });
      }

      // ─────────────────────────────────────────────────────────────────────────
      // Explicitly handle Date fields with .toISOString()
      // ─────────────────────────────────────────────────────────────────────────
      const dateFields = [
        'siteInspectionDate', 
        'technicalInspectionDate', 
        'followUpFirst', 
        'followUpSecond', 
        'followUpThird'
      ];
      
      dateFields.forEach(field => {
        const value = values[field as keyof FormSchema];
        if (value && value !== '') {
          try {
            const isoDate = new Date(value as string).toISOString();
            formData.append(field, isoDate);
            console.log(`✓ Date → ISO [${field}]:`, isoDate);
          } catch (err) {
            console.warn(`⚠️ Invalid date for ${field}:`, value);
          }
        }
      });

      // ─────────────────────────────────────────────────────────────────────────
      // Append file if selected (for quotationFile upload)
      // ─────────────────────────────────────────────────────────────────────────
      if (quotationFile) {
        formData.append('quotationFile', quotationFile);
        console.log('📎 Attaching file:', quotationFile.name);
      }

      // Log FormData entries for debugging
      console.log('📦 FormData Payload:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `[File: ${value.name}]` : value);
      }

      // Make API call - Let axios handle Content-Type automatically for FormData
      await api.patch(`/sales/orders/${order._id}`, formData);
      
      console.log('✅ Order updated successfully');
      toast.success('Order updated successfully!');
      
      // Close dialog and trigger refresh
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('❌ API Error:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update order';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Extract Upstream Data (Read-Only) ──────────────────────────────────────
  
  const customer = order.customer || order.customerId;
  const lead = order.salesLead;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl my-8">
        
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 sticky top-0 bg-[hsl(var(--card))] z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold">Edit Sales Order</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Order ID: {order.salesOrderId || order._id}
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
                SECTION A: Lead & Customer Context (READ-ONLY)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--muted-foreground))]"></div>
                <h3 className="text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Section A: Customer & Lead Context (Read-Only)
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-[hsl(var(--muted))]/20 rounded-xl border border-[hsl(var(--border))]/50">
                
                {/* Customer Data */}
                <div>
                  <label className={labelCls}>Customer ID</label>
                  <div className={readOnlyCls}>{customer?.customerId || '-'}</div>
                </div>
                
                <div>
                  <label className={labelCls}>Name</label>
                  <div className={readOnlyCls}>{customer?.name || '-'}</div>
                </div>
                
                <div>
                  <label className={labelCls}>Phone</label>
                  <div className={readOnlyCls}>{customer?.phone || '-'}</div>
                </div>
                
                <div>
                  <label className={labelCls}>Type</label>
                  <div className={readOnlyCls}>{(customer as any)?.type || '-'}</div>
                </div>
                
                <div>
                  <label className={labelCls}>Sector</label>
                  <div className={readOnlyCls}>{customer?.sector || '-'}</div>
                </div>
                
                <div>
                  <label className={labelCls}>Address</label>
                  <div className={readOnlyCls}>{customer?.address || '-'}</div>
                </div>
                
                <div>
                  <label className={labelCls}>Region</label>
                  <div className={readOnlyCls}>{(customer as any)?.region || '-'}</div>
                </div>
                
                {/* Lead Data */}
                <div>
                  <label className={labelCls}>Initial Issue (From Lead)</label>
                  <div className={readOnlyCls}>{order.salesLead?.issue || order.salesData?.issue || '-'}</div>
                </div>
                
                <div>
                  <label className={labelCls}>Order (From Lead)</label>
                  <div className={readOnlyCls}>{lead?.order || '-'}</div>
                </div>
                
                <div>
                  <label className={labelCls}>Reason (From Lead)</label>
                  <div className={readOnlyCls}>{(lead as any)?.reason || '-'}</div>
                </div>
                
                <div>
                  <label className={labelCls}>SalesPerson</label>
                  <div className={readOnlyCls}>{lead?.salesPerson || '-'}</div>
                </div>
                
                <div>
                  <label className={labelCls}>Date (Lead Creation)</label>
                  <div className={readOnlyCls}>{formatDateDisplay(lead?.date)}</div>
                </div>
                
                <div>
                  <label className={labelCls}>Status (Lead)</label>
                  <div className={readOnlyCls}>{(lead as any)?.status || '-'}</div>
                </div>
                
                <div className="md:col-span-2 lg:col-span-3">
                  <label className={labelCls}>Notes (Lead)</label>
                  <div className={readOnlyCls}>{(lead as any)?.notes || '-'}</div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION B: Order Details & Follow-Ups (EDITABLE)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--primary))]"></div>
                <h3 className="text-sm font-bold text-[hsl(var(--primary))] uppercase tracking-wider">
                  Section B: Order Progression (Editable)
                </h3>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className={labelCls}>Order Issue / Technical Notes</label>
                  <input
                    type="text"
                    placeholder="Describe the operational order issue..."
                    {...form.register('issue')}
                    className={iCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Type Of Order</label>
                  <select
                    {...form.register('typeOfOrder')}
                    className={iCls}
                  >
                    <option value="">Select order type...</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="General supplies">General supplies</option>
                    <option value="Supply and installation">Supply and installation</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Sales Platform</label>
                  <input
                    type="text"
                    placeholder="e.g., Website, Phone, WhatsApp"
                    {...form.register('salesPlatform')}
                    className={iCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Site Inspection Date</label>
                  <input
                    type="datetime-local"
                    {...form.register('siteInspectionDate')}
                    className={iCls}
                  />
                </div>

                {/* ─── Task 1: Conditional Technical Inspection ────────────── */}
                <div className="md:col-span-2">
                  <label className={labelCls}>Technical Inspection Required</label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...form.register('isTechnicalInspectionRequired')}
                        className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
                      />
                      <span className="text-sm font-medium">Yes, technical inspection is required</span>
                    </label>
                  </div>
                </div>

                {/* Conditional: Show only when Technical Inspection is checked */}
                {watchTechnicalInspection && (
                  <>
                    <div>
                      <label className={labelCls}>Technical Inspection Date</label>
                      <input
                        type="datetime-local"
                        {...form.register('technicalInspectionDate')}
                        className={iCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Technical Inspection Details</label>
                      <textarea
                        placeholder="Details about the technical inspection..."
                        {...form.register('technicalInspectionDetails')}
                        rows={3}
                        className={iCls}
                      />
                    </div>
                  </>
                )}

                {/* ─── Task 2: Quotation File Upload ───────────────────────── */}
                <div className="md:col-span-2">
                  <label className={labelCls}>Quotation Document</label>
                  <div className="space-y-2">
                    {/* Current File Display */}
                    {form.watch('quotationFileUrl') && !quotationFile && (
                      <div className="flex items-center gap-2 p-3 bg-[hsl(var(--muted))]/20 rounded-lg border border-[hsl(var(--border))]">
                        <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
                        <span className="text-sm flex-1">Current file: {form.watch('quotationFileUrl')?.split('/').pop()}</span>
                      </div>
                    )}
                    
                    {/* File Upload Input */}
                    <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))]/10 cursor-pointer transition-all group">
                      <Upload className="h-5 w-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {quotationFile ? quotationFile.name : 'Choose a file or drag here'}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                          PDF, DOC, DOCX (Max 5MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* First Follow-Up */}
              <div className="pt-4">
                <h4 className="text-sm font-semibold mb-3 text-[hsl(var(--foreground))]">First Follow-Up</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div>
                    <label className={labelCls}>Follow Up First (Date & Time)</label>
                    <input
                      type="datetime-local"
                      {...form.register('followUpFirst')}
                      className={iCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Quotation Status (1st)</label>
                    <select
                      {...form.register('quotationStatusFirstFollowUp')}
                      className={iCls}
                    >
                      <option value="">Select Status</option>
                      {QUOTATION_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>
                      Reason of Quotation
                      {isReasonDisabled && <span className="text-xs ml-2 text-[hsl(var(--muted-foreground))]">(Disabled when Accepted)</span>}
                    </label>
                    <textarea
                      placeholder="Reason for quotation status"
                      {...form.register('reasonOfQuotation')}
                      disabled={isReasonDisabled}
                      rows={3}
                      className={iCls}
                    />
                  </div>
                </div>
              </div>

              {/* Second Follow-Up */}
              <div className="pt-4">
                <h4 className="text-sm font-semibold mb-3 text-[hsl(var(--foreground))]">
                  Second Follow-Up
                  {isFollowUp2Disabled && <span className="text-xs ml-2 text-[hsl(var(--muted-foreground))]">(Requires 1st Follow-Up)</span>}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div>
                    <label className={labelCls}>Follow Up Second (Date & Time)</label>
                    <input
                      type="datetime-local"
                      {...form.register('followUpSecond')}
                      disabled={isFollowUp2Disabled}
                      className={iCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Status (2nd Follow Up)</label>
                    <select
                      {...form.register('statusSecondFollowUp')}
                      disabled={isFollowUp2Disabled}
                      className={iCls}
                    >
                      <option value="">Select Status</option>
                      {QUOTATION_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Third Follow-Up - Task 3: Pipeline Guard */}
              <div className="pt-4">
                <h4 className="text-sm font-semibold mb-3 text-[hsl(var(--foreground))]">
                  Third Follow-Up
                  {isFollowUp3Disabled && (
                    <span className="text-xs ml-2 text-[hsl(var(--muted-foreground))]">
                      (Requires 2nd Follow-Up with Status)
                    </span>
                  )}
                </h4>
                
                {isFollowUp3Disabled ? (
                  <div className="p-4 rounded-xl bg-[hsl(var(--muted))]/20 border border-[hsl(var(--border))]">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      ⚠️ Third Follow-Up is locked. Please complete the Second Follow-Up (date and status) to unlock this section.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Follow Up Third (Date & Time)</label>
                      <input
                        type="datetime-local"
                        {...form.register('followUpThird')}
                        className={iCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Final Status (3rd)</label>
                      <select
                        {...form.register('finalStatusThirdFollowUp')}
                        className={iCls}
                      >
                        <option value="">Select Final Status</option>
                        {FINAL_STATUSES.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes (Order Notes)</label>
                <textarea
                  placeholder="Additional notes about this order..."
                  {...form.register('notes')}
                  rows={4}
                  className={iCls}
                />
              </div>
            </div>

            {/* Error Display - Validation errors are handled via toast in onError */}
            {form.formState.errors && Object.keys(form.formState.errors).length > 0 && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                Please check the form for errors.
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
