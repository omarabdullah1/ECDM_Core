'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, FileText, FilePlus, Edit, PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { SalesOrder } from './columns';
import AddQuotationDialog from './AddQuotationDialog';

import { generateQuotationPDF } from '@/utils/generateQuotationPDF';
import { useAuthStore } from '@/features/auth/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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
  readOnly?: boolean;
  initialEditMode?: boolean;
}

interface FormData {
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

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
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

/**
 * Format Sales Person for display: "FirstName LastName" or string ID
 */
const formatSalesPerson = (sp: string | { firstName?: string; lastName?: string; email?: string } | null | undefined): string => {
  if (!sp) return '-';
  if (typeof sp === 'string') return sp;
  return sp.email || `${sp.firstName || ''} ${sp.lastName || ''}`.trim() || '-';
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function EditSalesOrderDialog({ order, onClose, onSuccess, readOnly = false, initialEditMode = false }: EditSalesOrderDialogProps) {
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showApprovalAlert, setShowApprovalAlert] = useState(false);
  const [showQuotationBuilder, setShowQuotationBuilder] = useState(false);
  const [internalPreviewMode, setInternalPreviewMode] = useState(!initialEditMode);

  useEffect(() => {
    if (order) {
      setInternalPreviewMode(!initialEditMode);
    }
  }, [order, initialEditMode]);

  // ═══════════════════════════════════════════════════════════════════
  // OWNERSHIP & READ-ONLY LOGIC
  // ═══════════════════════════════════════════════════════════════════
  const { user: currentUser } = useAuthStore();
  
  // Safely extract current user ID and role
  const currentUserId = currentUser?._id;
  const currentUserRole = currentUser?.role;
  
  // Safely extract order owner ID (handle both populated object and string ID)
  const ownerId = typeof order.salesPerson === 'object' 
    ? (order.salesPerson as any)?._id 
    : order.salesPerson;
  
  // Determine if user is admin or owner
  const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'SuperAdmin' || currentUserRole === 'Manager';
  const isOwner = currentUserId && ownerId && currentUserId.toString() === ownerId.toString();
  
  // Read-only mode: explicit readOnly prop OR (NOT admin AND NOT owner)
  const isReadOnly = readOnly || (!isAdmin && !isOwner);
  const effectivelyReadOnly = isReadOnly || internalPreviewMode;
  
  console.log('🔒 EditSalesOrderDialog - Access Control:', {
    currentUserId,
    currentUserRole,
    ownerId,
    isAdmin,
    isOwner,
    isReadOnly
  });

  // Initialize react-hook-form with Zod validation
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      issue: order.issue || '', // STRICTLY the Order Issue
      typeOfOrder: order.typeOfOrder || '',
      // Smart Inheritance: Fallback to Lead/Data values if Order doesn't have them
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

  // Watch: Third Follow-Up Pipeline Guard (requires second follow-up with status)
  const watchFollowUpSecond = form.watch('followUpSecond');
  const watchStatusSecond = form.watch('statusSecondFollowUp');

  // Progressive Locking Logic
  const positiveStatuses = ['Accepted', 'Scheduled'];
  const isFirstPositive = positiveStatuses.includes(watchQuotationStatus || '');
  const isSecondPositive = positiveStatuses.includes(watchStatusSecond || '');

  const disableSecondFollowUp = !watchFollowUpFirst || isFirstPositive;
  const disableThirdFollowUp = !watchFollowUpSecond || !watchStatusSecond || isFirstPositive || isSecondPositive;

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

  // ─── Quotation Deletion Handler ────────────────────────────────────────────
  const handleRemoveQuotation = async () => {
    if (!window.confirm('Are you sure you want to completely remove this quotation? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await api.patch(`/sales/orders/${order._id}`, {
        quotation: null,
        quotationFileUrl: '',
        quotationFileName: ''
      });

      if (response.status === 200 || response.status === 204 || response.status === 202) {
        toast.success('Quotation removed successfully!');
        window.location.reload(); // Refresh to update the UI correctly
      }
    } catch (error: any) {
      console.error('Failed to remove quotation:', error);
      alert(`Error: ${error.response?.data?.message || 'Failed to remove quotation.'}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Submit Handler (API Request with FormData) ────────────────────────────
  const onSubmit = async (values: FormSchema) => {
    // Additional safety check: prevent submission in read-only mode
    if (effectivelyReadOnly) {
      toast.error('You cannot modify this order in preview mode.');
      return;
    }
    
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
      const response = await api.patch(`/sales/orders/${order._id}`, formData);

      // ─────────────────────────────────────────────────────────────────────────
      // DEBUG: Log response details
      // ─────────────────────────────────────────────────────────────────────────
      console.log('🔍 API Response Status:', response.status);
      console.log('🔍 API Response Data:', response.data);

      // ─────────────────────────────────────────────────────────────────────────
      // Handle Smart Update Responses
      // ─────────────────────────────────────────────────────────────────────────
      const meta = response.data?.meta;
      
      if (response.status === 202) {
        // Only modification request created (all changes need approval)
        console.log('⏳ All changes require approval - Pending admin review');
        console.log('🔔 Setting showApprovalAlert to TRUE');
        setSaving(false);
        setShowApprovalAlert(true);
        return; // CRITICAL: Exit here - DO NOT call onClose()
      }

      if (response.status === 200) {
        // Handle different combinations of direct updates and modification requests
        const directUpdatesApplied = meta?.directUpdatesApplied;
        const modificationRequestCreated = meta?.modificationRequestCreated;

        if (directUpdatesApplied && modificationRequestCreated) {
          // Mixed: Some fields updated directly, others need approval
          console.log('✅ Partial update:', {
            directFields: meta.directlyUpdatedFields,
            approvalFields: meta.fieldsAwaitingApproval
          });
          toast.success('New fields saved! Changes to existing data submitted for approval.', {
            duration: 5000,
          });
        } else if (modificationRequestCreated) {
          // Should not reach here (should be 202), but handle just in case
          console.log('⏳ Changes require approval');
          setSaving(false);
          setShowApprovalAlert(true);
          return;
        } else if (directUpdatesApplied) {
          // All updates applied directly (no approval needed)
          console.log('✅ All updates applied directly');
          toast.success(response.data?.message || 'Order updated successfully!');
        } else {
          // No changes detected
          console.log('ℹ️ No changes detected');
          toast('No changes were made.', { icon: 'ℹ️' });
        }
      }

      // Close dialog and trigger refresh
      onSuccess();
      onClose();
    } catch (err: unknown) {
      // Comprehensive error logging for debugging
      console.error('❌ API Error - Full Error Object:', err);
      
      const axiosError = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            error?: string;
            details?: any;
          };
          statusText?: string;
        };
        message?: string;
      };

      // Log detailed error information
      if (axiosError.response) {
        console.error('❌ Error Status:', axiosError.response.status);
        console.error('❌ Error Status Text:', axiosError.response.statusText);
        console.error('❌ Error Response Data:', axiosError.response.data);
      } else {
        console.error('❌ Error Message:', axiosError.message);
      }

      // Extract user-friendly error message
      let errorMessage = 'Failed to update order';
      let is409Conflict = false;
      
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        
        // Handle 409 Conflict specifically
        if (axiosError.response.status === 409) {
          is409Conflict = true;
          errorMessage = data.message || data.error || 'Conflict: This operation conflicts with the current state of the order';
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }

      console.error('❌ Final Error Message Shown to User:', errorMessage);
      
      // Show 409 conflicts as warnings (expected business logic), others as errors
      if (is409Conflict) {
        toast(errorMessage, { 
          duration: 6000,
          icon: '⚠️',
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Extract Upstream Data (Read-Only) ──────────────────────────────────────

  const customer = order.customer || order.customerId;
  const lead = order.salesLead;

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
              <DialogTitle>
                {effectivelyReadOnly ? 'View Sales Order' : 'Edit Sales Order'}
                {isReadOnly && ' (Read-Only)'}
              </DialogTitle>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Order ID: {order.salesOrderId || order._id}
                {effectivelyReadOnly && <span className="ml-2 text-amber-600 font-semibold">• Preview Mode</span>}
              </p>
          </DialogHeader>

          <DialogBody>
            <form id="edit-sales-order-form" onSubmit={form.handleSubmit(onSubmit, onError)}>
              <div className="space-y-8">

              {/* ═══════════════════════════════════════════════════════════════
                SECTION A: Lead & Customer Context (READ-ONLY)
            ═══════════════════════════════════════════════════════════════ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
                  <div className="h-1 w-1 rounded-full bg-[hsl(var(--muted-foreground))]"></div>
                  <h3 className="text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    Section A: Customer & Source Context (Read-Only)
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
                    <label className={labelCls}>Initial Issue (From Source)</label>
                    <div className={readOnlyCls}>{order.salesLead?.issue || order.salesData?.issue || '-'}</div>
                  </div>

                  <div>
                    <label className={labelCls}>Source Order Status</label>
                    <div className={readOnlyCls}>{order.salesLead?.order || order.salesData?.order || '-'}</div>
                  </div>

                  <div>
                    <label className={labelCls}>Source Outcome</label>
                    <div className={readOnlyCls}>{(order.salesLead as any)?.reason || order.salesData?.callOutcome || '-'}</div>
                  </div>

                  <div>
                    <label className={labelCls}>Source Salesperson</label>
                    <div className={readOnlyCls}>{formatSalesPerson(order.salesLead?.salesPerson || order.salesData?.salesPerson)}</div>
                  </div>

                  <div>
                    <label className={labelCls}>Source Creation Date</label>
                    <div className={readOnlyCls}>{formatDateDisplay(order.salesLead?.date || order.salesData?.callDate || (order.salesData as any)?.createdAt)}</div>
                  </div>

                  <div>
                    <label className={labelCls}>Source Status</label>
                    <div className={readOnlyCls}>{(order.salesLead as any)?.status || order.salesData?.callOutcome || '-'}</div>
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className={labelCls}>Source Notes</label>
                    <div className={readOnlyCls}>{(order.salesLead as any)?.notes || order.salesData?.notes || '-'}</div>
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
                      disabled={effectivelyReadOnly}
                      className={iCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Type Of Order</label>
                    <select
                      {...form.register('typeOfOrder')}
                      disabled={effectivelyReadOnly}
                      className={iCls}
                    >
                      <option value="">Select order type...</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="General supplies">General supplies</option>
                      <option value="Supply and installation">Supply and installation</option>
                    </select>
                  </div>

                  {order.salesData && (
                    <div>
                      <label className={labelCls}>Sales Platform</label>
                      <div className={readOnlyCls}>
                        {order.salesData.salesPlatform || '-'}
                      </div>
                    </div>
                  )}

                  {/* ─── Task 1: Conditional Technical Inspection ────────────── */}
                  <div className="md:col-span-2">
                    <label className={labelCls}>Technical Inspection Required</label>
                    <div className="flex items-center gap-3 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          {...form.register('isTechnicalInspectionRequired')}
                          disabled={effectivelyReadOnly}
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
                          disabled={effectivelyReadOnly}
                          className={iCls}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Technical Inspection Details</label>
                        <textarea
                          placeholder="Details about the technical inspection..."
                          {...form.register('technicalInspectionDetails')}
                          disabled={effectivelyReadOnly}
                          rows={3}
                          className={iCls}
                        />
                      </div>
                    </>
                  )}

                  {/* ─── Task 2: Quotation Document (System Builder OR Manual Upload) ───────────────────────── */}
                  <div className="md:col-span-2 border rounded-xl p-4 bg-[hsl(var(--muted))]/10 space-y-4">
                    {/* System Quotation Builder Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[hsl(var(--border))]">
                      <div>
                        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                          <FilePlus className="w-4 h-4 text-[hsl(var(--primary))]" />
                          System Quotation Tool
                        </h3>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                          Generate a professional PDF quotation directly from inventory
                        </p>
                      </div>

                      {/* CONDITIONAL RENDERING HERE */}
                      {(order as any).quotation?.items?.length > 0 ? (
                        // What to show if Quotation EXISTS
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => generateQuotationPDF(order as any, 'view')}
                            className="px-4 py-2 border border-[hsl(var(--border))] text-blue-600 rounded-lg hover:bg-[hsl(var(--muted))]/50 transition-all text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                          >
                            <FileText className="w-4 h-4 mr-2" /> View PDF
                          </button>
                          {!isReadOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => setShowQuotationBuilder(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                              >
                                <Edit className="w-4 h-4 mr-2" /> Edit Quotation
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveQuotation}
                                className="p-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-all text-sm font-medium flex items-center justify-center whitespace-nowrap"
                                title="Remove Quotation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        // What to show if NO Quotation exists
                        !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => setShowQuotationBuilder(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                          >
                            <PlusCircle className="w-4 h-4 mr-2" /> Create Quotation
                          </button>
                        )
                      )}
                    </div>

                    {/* Manual File Upload Section */}
                    {/* Only show the manual upload option if they haven't used the system builder */}
                    {(!(order as any).quotation?.items || (order as any).quotation.items.length === 0) && !isReadOnly && (
                      <div>
                        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
                          <Upload className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          OR Upload External Document
                        </h3>
                        <div className="space-y-2">
                          {/* Current File Display */}
                          {form.watch('quotationFileUrl') && !quotationFile && (
                            <div className="flex items-center gap-2 p-3 bg-[hsl(var(--background))] rounded-lg border border-[hsl(var(--border))]">
                              <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
                              <span className="text-sm flex-1">Current file: {form.watch('quotationFileUrl')?.split('/').pop()}</span>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={handleRemoveQuotation}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                  title="Remove Uploaded File"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* File Upload Input */}
                          <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--background))] cursor-pointer transition-all group">
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
                    )}
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
                        disabled={effectivelyReadOnly}
                        className={iCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Quotation Status (1st)</label>
                      <select
                        {...form.register('quotationStatusFirstFollowUp')}
                        disabled={effectivelyReadOnly}
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
                        disabled={isReasonDisabled || effectivelyReadOnly}
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
                    {disableSecondFollowUp && (
                      <span className="text-xs ml-2 text-[hsl(var(--muted-foreground))]">
                        {isFirstPositive ? "(Locked: Previous Status is Positive)" : "(Requires 1st Follow-Up)"}
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                      <label className={`${labelCls} ${disableSecondFollowUp ? "text-gray-400" : ""}`}>Follow Up Second (Date & Time)</label>
                      <input
                        type="datetime-local"
                        {...form.register('followUpSecond')}
                        disabled={disableSecondFollowUp || effectivelyReadOnly}
                        className={`${iCls} ${disableSecondFollowUp ? "bg-gray-100 cursor-not-allowed opacity-70" : ""}`}
                      />
                    </div>

                    <div>
                      <label className={`${labelCls} ${disableSecondFollowUp ? "text-gray-400" : ""}`}>Status (2nd Follow Up)</label>
                      <select
                        {...form.register('statusSecondFollowUp')}
                        disabled={disableSecondFollowUp || effectivelyReadOnly}
                        className={`${iCls} ${disableSecondFollowUp ? "bg-gray-100 cursor-not-allowed opacity-70" : ""}`}
                      >
                        <option value="">Select Status</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Not Required">Not Required</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Third Follow-Up */}
                <div className="pt-4">
                  <h4 className="text-sm font-semibold mb-3 text-[hsl(var(--foreground))]">
                    Third Follow-Up
                    {disableThirdFollowUp && (
                      <span className="text-xs ml-2 text-[hsl(var(--muted-foreground))]">
                        {(isFirstPositive || isSecondPositive) ? "(Locked: Previous Status is Positive)" : "(Requires 2nd Follow-Up with Status)"}
                      </span>
                    )}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`${labelCls} ${disableThirdFollowUp ? "text-gray-400" : ""}`}>Follow Up Third (Date & Time)</label>
                      <input
                        type="datetime-local"
                        {...form.register('followUpThird')}
                        disabled={disableThirdFollowUp || effectivelyReadOnly}
                        className={`${iCls} ${disableThirdFollowUp ? "bg-gray-100 cursor-not-allowed opacity-70" : ""}`}
                      />
                    </div>

                    <div>
                      <label className={`${labelCls} ${disableThirdFollowUp ? "text-gray-400" : ""}`}>Final Status (3rd)</label>
                      <select
                        {...form.register('finalStatusThirdFollowUp')}
                        disabled={disableThirdFollowUp || effectivelyReadOnly}
                        className={`${iCls} ${disableThirdFollowUp ? "bg-gray-100 cursor-not-allowed opacity-70" : ""}`}
                      >
                        <option value="">Select Final Status</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Not Potential">Not Potential</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className={labelCls}>Notes (Order Notes)</label>
                  <textarea
                    placeholder="Additional notes about this order..."
                    {...form.register('notes')}
                    disabled={effectivelyReadOnly}
                    rows={4}
                    className={iCls}
                  />
                </div>
              </div>
            </div>

            {/* ─── Footer Actions ─────────────────────────────────────────────── */}
            <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))] mt-6">
              {effectivelyReadOnly ? (
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-[hsl(var(--border))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
                  >
                    Close
                  </button>
                  {!isReadOnly && (
                    <button
                      type="button"
                      key="btn-edit" onClick={(e) => { e.preventDefault(); setInternalPreviewMode(false); }}
                      className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" /> Edit Order
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setInternalPreviewMode(true)}
                    className="flex-1 rounded-xl border border-[hsl(var(--border))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="protect-mount flex-1 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </form>
        </DialogBody>
      </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          Maker-Checker Approval Alert Dialog
          Shown when status 202 is returned (non-admin edit pending approval)
      ═══════════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={showApprovalAlert} onOpenChange={setShowApprovalAlert}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Approval Required</AlertDialogTitle>
            <AlertDialogDescription>
              Your modifications have been submitted successfully. However, they require Admin approval before taking effect on the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                console.log('✅ User acknowledged approval requirement');
                setShowApprovalAlert(false);
                onSuccess(); // Refresh the data table
                onClose(); // Close the parent Edit Dialog
              }}
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          System Quotation Builder Dialog
          Allows creating/editing quotation directly from inventory
      ═══════════════════════════════════════════════════════════════════════ */}
      {showQuotationBuilder && (
        <AddQuotationDialog
          order={order}
          onClose={() => setShowQuotationBuilder(false)}
          onSuccess={() => {
            setShowQuotationBuilder(false);
            onSuccess(); // Refresh parent data to show updated quotation status
          }}
        />
      )}
    </>
  );
}

