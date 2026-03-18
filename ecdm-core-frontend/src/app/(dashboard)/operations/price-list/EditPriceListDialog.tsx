'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { PRICE_LIST_CATEGORIES, type PriceListItem } from './columns';

interface EditPriceListDialogProps {
    item: PriceListItem;
    onClose: () => void;
    onSuccess: () => void;
}

const formSchema = z.object({
    itemName: z.string().min(1, 'Item name is required').max(200),
    specification: z.string().max(2000).optional(),
    category: z.string().optional(),
    unitPrice: z.string().optional(),
    notes: z.string().max(2000).optional(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataSheet: z.any().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

const iCls =
    'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed';
const labelCls =
    'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';

export default function EditPriceListDialog({ item, onClose, onSuccess }: EditPriceListDialogProps) {
    const [dataSheetFile, setDataSheetFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            itemName: item.itemName ?? '',
            specification: item.specification ?? '',
            category: item.category ?? '',
            unitPrice: item.unitPrice != null ? String(item.unitPrice) : '0',
            notes: item.notes ?? '',
        },
    });

    useEffect(() => {
        form.reset({
            itemName: item.itemName ?? '',
            specification: item.specification ?? '',
            category: item.category ?? '',
            unitPrice: item.unitPrice != null ? String(item.unitPrice) : '0',
            notes: item.notes ?? '',
        });
    }, [item, form]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file && file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed');
            return;
        }
        setDataSheetFile(file);
    };

    const onError = (errors: Record<string, unknown>) => {
        console.error('❌ Form Validation Errors:', errors);
        toast.error('Please fill in all required fields correctly.');
    };

    const onSubmit = async (values: FormSchema) => {
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('itemName', values.itemName);
            if (values.specification !== undefined) formData.append('specification', values.specification);
            if (values.category !== undefined) formData.append('category', values.category);
            if (values.unitPrice !== undefined) formData.append('unitPrice', String(values.unitPrice));
            if (values.notes !== undefined) formData.append('notes', values.notes);
            if (dataSheetFile) formData.append('dataSheet', dataSheetFile);

            await api.patch(`/operations/price-list/${item._id}`, formData);
            toast.success('Price list item updated successfully!');
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update item';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-6 outline-none">

                <DialogHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--border))] pb-4 mb-4 space-y-0">
                    <div>
                        <DialogTitle className="text-xl font-bold">Edit Price List Item</DialogTitle>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            {item.sparePartsId} — {item.itemName}
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

                <form onSubmit={form.handleSubmit(onSubmit, onError)}>
                    <div className="space-y-5">

                        {/* Item Name */}
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

                        {/* Specification */}
                        <div>
                            <label className={labelCls}>Specification</label>
                            <textarea
                                {...form.register('specification')}
                                placeholder="Enter specification details"
                                rows={3}
                                className={iCls}
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className={labelCls}>Category</label>
                            <select {...form.register('category')} className={iCls}>
                                <option value="">— Select category —</option>
                                {PRICE_LIST_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Unit Price */}
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

                        {/* Notes */}
                        <div>
                            <label className={labelCls}>Notes</label>
                            <textarea
                                {...form.register('notes')}
                                placeholder="Additional notes"
                                rows={2}
                                className={iCls}
                            />
                        </div>

                        {/* Data Sheet */}
                        <div>
                            <label className={labelCls}>
                                Data Sheet (PDF)
                                {item.dataSheetUrl && (
                                    <span className="ms-2 normal-case font-normal text-[hsl(var(--muted-foreground))]">
                                        — existing file will be replaced if a new one is uploaded
                                    </span>
                                )}
                            </label>
                            <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-6 text-center hover:border-[hsl(var(--primary))] transition-colors">
                                {dataSheetFile ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <FileText className="w-8 h-8 text-[hsl(var(--primary))]" />
                                        <div className="text-left">
                                            <p className="font-medium text-sm">{dataSheetFile.name}</p>
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
                                    <label className="cursor-pointer block">
                                        <Upload className="w-10 h-10 mx-auto text-[hsl(var(--muted-foreground))] mb-2" />
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                            {item.dataSheetUrl
                                                ? 'Click to replace existing data sheet'
                                                : 'Click to upload or drag and drop'}
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

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] pt-4 mt-6">
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
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
