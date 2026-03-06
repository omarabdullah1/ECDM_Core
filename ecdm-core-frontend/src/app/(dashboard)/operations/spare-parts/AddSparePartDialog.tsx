'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

/**
 * Add Spare Part Dialog
 * 
 * Features:
 * - FormData submission for file upload (PDF Data Sheet)
 * - Zod validation
 * - Drag & drop file upload zone
 */

// ─────────────────────────────────────────────────────────────────────────────
// Props Interface
// ─────────────────────────────────────────────────────────────────────────────

interface AddSparePartDialogProps {
    onClose: () => void;
    onSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schema
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
    itemName: z.string().min(1, 'Item name is required').max(200, 'Item name cannot exceed 200 characters'),
    specification: z.string().max(2000, 'Specification cannot exceed 2000 characters').optional(),
    category: z.string().max(100, 'Category cannot exceed 100 characters').optional(),
    unitPrice: z.string().optional(), // Converted to number in submit handler
    notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataSheet: z.any().optional(), // File handled separately
});

type FormSchema = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AddSparePartDialog({ onClose, onSuccess }: AddSparePartDialogProps) {
    const [dataSheetFile, setDataSheetFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            itemName: '',
            specification: '',
            category: '',
            unitPrice: '0',
            notes: '',
        },
    });

    // ─── File Handler ─────────────────────────────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file && file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed');
            return;
        }
        setDataSheetFile(file);
    };

    // ─── Error Handler ────────────────────────────────────────────────────────
    const onError = (errors: Record<string, unknown>) => {
        console.error('❌ Form Validation Errors:', errors);
        toast.error('Please fill in all required fields correctly.');
    };

    // ─── Submit Handler (FormData for file upload) ────────────────────────────
    const onSubmit = async (values: FormSchema) => {
        console.log('✅ Form validation passed. Submitting:', values);
        setSaving(true);

        try {
            const formData = new FormData();
            
            // ─── Append text fields ───────────────────────────────────────────────
            formData.append('itemName', values.itemName);
            
            if (values.specification) {
                formData.append('specification', values.specification);
            }
            
            if (values.category) {
                formData.append('category', values.category);
            }
            
            if (values.unitPrice !== undefined) {
                formData.append('unitPrice', String(values.unitPrice));
            }
            
            if (values.notes) {
                formData.append('notes', values.notes);
            }
            
            // ─── Handle File Upload ───────────────────────────────────────────────
            if (dataSheetFile) {
                formData.append('dataSheet', dataSheetFile);
                console.log('📎 Attaching file:', dataSheetFile.name);
            }

            // Log FormData entries for debugging
            console.log('📦 FormData Payload:');
            for (const [key, value] of formData.entries()) {
                console.log(`  ${key}:`, value instanceof File ? `[File: ${value.name}]` : value);
            }

            // API call - Let axios handle Content-Type automatically for FormData
            await api.post('/operations/spare-parts', formData);
            
            console.log('✅ Spare part created successfully');
            toast.success('Spare part created successfully!');
            
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error('❌ API Error:', err);
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create spare part';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl my-8">
                
                {/* ─── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 sticky top-0 bg-[hsl(var(--card))] z-10 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold">Add Spare Part</h2>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            Create a new spare part inventory item
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
                    <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                        
                        {/* ─── Item Name (Required) ──────────────────────────────── */}
                        <div>
                            <label className={labelCls}>Item Name *</label>
                            <input
                                type="text"
                                {...form.register('itemName')}
                                placeholder="Enter item name"
                                className={iCls}
                            />
                            {form.formState.errors.itemName && (
                                <p className="text-red-500 text-xs mt-1">
                                    {form.formState.errors.itemName.message}
                                </p>
                            )}
                        </div>

                        {/* ─── Specification ─────────────────────────────────────── */}
                        <div>
                            <label className={labelCls}>Specification</label>
                            <textarea
                                {...form.register('specification')}
                                placeholder="Enter specification details"
                                rows={3}
                                className={iCls}
                            />
                        </div>

                        {/* ─── Category ──────────────────────────────────────────── */}
                        <div>
                            <label className={labelCls}>Category</label>
                            <input
                                type="text"
                                {...form.register('category')}
                                placeholder="e.g., Electrical, Mechanical, Plumbing"
                                className={iCls}
                            />
                        </div>

                        {/* ─── Unit Price ────────────────────────────────────────── */}
                        <div>
                            <label className={labelCls}>Unit Price ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                {...form.register('unitPrice')}
                                placeholder="0.00"
                                className={iCls}
                            />
                        </div>

                        {/* ─── Notes ─────────────────────────────────────────────── */}
                        <div>
                            <label className={labelCls}>Notes</label>
                            <textarea
                                {...form.register('notes')}
                                placeholder="Additional notes"
                                rows={2}
                                className={iCls}
                            />
                        </div>

                        {/* ─── Data Sheet Upload ─────────────────────────────────── */}
                        <div>
                            <label className={labelCls}>Data Sheet (PDF)</label>
                            <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-6 text-center hover:border-[hsl(var(--primary))] transition-colors">
                                {dataSheetFile ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <FileText className="w-8 h-8 text-[hsl(var(--primary))]" />
                                        <div className="text-left">
                                            <p className="font-medium">{dataSheetFile.name}</p>
                                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                                {(dataSheetFile.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setDataSheetFile(null)}
                                            className="p-1 hover:bg-[hsl(var(--muted))] rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer">
                                        <Upload className="w-10 h-10 mx-auto text-[hsl(var(--muted-foreground))] mb-2" />
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                            PDF files only (max 10MB)
                                        </p>
                                        <input
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ─── Footer ─────────────────────────────────────────────────── */}
                    <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] px-6 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Creating...' : 'Create Spare Part'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
