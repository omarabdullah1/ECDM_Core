import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import api from '@/lib/axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { PRICE_LIST_CATEGORIES } from './columns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface AddPriceListDialogProps {
    onClose: () => void;
    onSuccess: () => void;
}

const formSchema = z.object({
    itemName: z.string().min(1, 'Item name is required').max(200),
    specification: z.string().max(2000).optional(),
    category: z.string().optional(),
    unitPrice: z.string().optional(),
    availableQuantity: z.string().optional(),
    minStockLevel: z.string().optional(),
    notes: z.string().max(2000).optional(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataSheet: z.any().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

const iCls =
    'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed';
const labelCls =
    'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';

export default function AddPriceListDialog({ onClose, onSuccess }: AddPriceListDialogProps) {
    const [dataSheetFile, setDataSheetFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            itemName: '',
            specification: '',
            category: '',
            unitPrice: '0',
            availableQuantity: '0',
            minStockLevel: '5',
            notes: '',
        },
    });

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
            if (values.specification) formData.append('specification', values.specification);
            if (values.category) formData.append('category', values.category);
            if (values.unitPrice !== undefined) formData.append('unitPrice', String(values.unitPrice));
            if (values.availableQuantity !== undefined) formData.append('availableQuantity', String(values.availableQuantity));
            if (values.minStockLevel !== undefined) formData.append('minStockLevel', String(values.minStockLevel));
            if (values.notes) formData.append('notes', values.notes);
            if (dataSheetFile) formData.append('dataSheet', dataSheetFile);

            await api.post('/operations/price-list', formData);
            toast.success('Price list item created successfully!');
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to create item';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                            <DialogTitle>Add Price List Item</DialogTitle>
                            <p className="text-[10px] font-medium text-gray-400 mt-0.5 uppercase tracking-widest">Pricing & Inventory Management</p>
                        </div>
                    </div>
                </DialogHeader>

                <DialogBody>
                    <form id="add-price-list-form" onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Name</label>
                            <Input {...form.register('itemName')} placeholder="e.g. Industrial Steel Plate" />
                            {form.formState.errors.itemName && (
                                <p className="text-[10px] font-medium text-red-500 mt-1">{form.formState.errors.itemName.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</label>
                                <Select {...form.register('category')}>
                                    <option value="">Select Category...</option>
                                    {PRICE_LIST_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unit Price ($)</label>
                                <Input type="number" step="0.01" min="0" {...form.register('unitPrice')} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[hsl(var(--primary))] uppercase tracking-widest">Initial Qty</label>
                                <Input type="number" min="0" {...form.register('availableQuantity')} placeholder="0" className="border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5 font-bold" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Low Stock Alert Level (Min Quantity)</label>
                            <Input type="number" min="0" {...form.register('minStockLevel')} placeholder="5" className="border-amber-200 bg-amber-50/30" />
                            <p className="text-[9px] text-amber-500 font-medium">You will be notified when stock drops below this number.</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Technical Specifications</label>
                            <textarea
                                {...form.register('specification')}
                                placeholder="Enter detailed technical specs..."
                                rows={3}
                                className="w-full rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Documentation (PDF)</label>
                            <div className="border border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-gray-50/50 transition-all group overflow-hidden relative">
                                {dataSheetFile ? (
                                    <div className="flex items-center justify-center gap-4 animate-in fade-in zoom-in-95">
                                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-sm text-gray-900">{dataSheetFile.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{(dataSheetFile.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setDataSheetFile(null)}
                                            className="ml-4 p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer block">
                                        <Upload className="w-8 h-8 mx-auto text-gray-300 mb-2 group-hover:text-primary transition-colors" />
                                        <p className="text-xs font-bold text-gray-700 tracking-tight">Upload Data Sheet</p>
                                        <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase">PDF only · Max 10MB</p>
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

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Private Remarks</label>
                            <textarea
                                {...form.register('notes')}
                                placeholder="Internal use only..."
                                rows={2}
                                className="w-full rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                            />
                        </div>
                    </form>
                </DialogBody>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" form="add-price-list-form" disabled={saving}>
                        {saving ? 'Creating Item...' : 'Add to Price List'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
