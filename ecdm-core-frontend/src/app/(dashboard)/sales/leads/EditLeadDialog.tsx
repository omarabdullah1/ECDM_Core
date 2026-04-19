'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import toast from 'react-hot-toast';
import type { SalesLead, OrderOption } from './page';
import { STATUSES, TYPE_OF_ORDER, SALES_PLATFORM } from './page';

interface EditLeadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    lead: SalesLead | null;
    onRequiresApproval: () => void;
    isReadOnly?: boolean;
}

const blankEdit = {
    issue: '',
    order: '' as OrderOption,
    reason: '',
    notes: '',
    status: 'New' as SalesLead['status'],
    address: '',
    region: '',
    typeOfOrder: '',
    salesPlatform: '',
};

export function EditLeadDialog({ isOpen, onClose, onSuccess, lead, onRequiresApproval, isReadOnly = false }: EditLeadDialogProps) {
    const [form, setForm] = useState(blankEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (lead) {
            const normalizedOrder: OrderOption = lead.order === 'Yes' ? 'Yes' : lead.order === 'No' ? 'No' : '';
            setForm({
                issue: lead.issue || '',
                order: normalizedOrder,
                reason: lead.reason || '',
                notes: lead.notes || '',
                status: lead.status || 'New',
                address: lead.customerId?.address || '',
                region: lead.customerId?.region || '',
                typeOfOrder: lead.typeOfOrder || '',
                salesPlatform: lead.salesPlatform || '',
            });
        }
    }, [lead]);

    const u = (f: keyof typeof blankEdit) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(p => ({ ...p, [f]: e.target.value }));

    const save = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!lead) return;

        setSaving(true);
        setError('');
        const pl: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(form)) {
            if (v !== '') pl[k] = v;
        }

        try {
            const response = await api.patch(`/sales/leads/${lead._id}`, pl);

            if (response.status === 202) {
                onRequiresApproval();
                return;
            }

            toast.success('Lead updated successfully');
            onSuccess();
            onClose();
        } catch (e: unknown) {
            const errorMessage = (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update lead';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    if (!lead) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <div>
                        <DialogTitle>{isReadOnly ? 'Lead Preview' : 'Update Lead'}</DialogTitle>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            {lead.customerId?.customerId} • {lead.customerId?.name || '-'}
                        </p>
                    </div>
                </DialogHeader>

                <DialogBody>
                    <form id="edit-lead-form" onSubmit={save} className="space-y-4">
                        {/* Read-only info */}
                        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 text-[11px] leading-relaxed">
                            <div className="space-y-0.5"><span className="text-gray-400 font-medium uppercase">Phone:</span> <span className="font-semibold text-gray-700">{lead.customerId?.phone || '-'}</span></div>
                            <div className="space-y-0.5"><span className="text-gray-400 font-medium uppercase">Type:</span> <span className="font-semibold text-gray-700">{lead.customerId?.type || '-'}</span></div>
                            <div className="space-y-0.5"><span className="text-gray-400 font-medium uppercase">Sector:</span> <span className="font-semibold text-gray-700">{lead.customerId?.sector || '-'}</span></div>
                            <div className="space-y-0.5"><span className="text-gray-400 font-medium uppercase">Sales Person:</span> <span className="font-semibold text-gray-700">{lead.salesPerson || 'Auto-assigned'}</span></div>
                        </div>

                        {/* Customer Fields - Editable */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest">Address</label>
                                <Input placeholder="Customer address..." value={form.address} onChange={u('address')} disabled={isReadOnly} />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest">Region</label>
                                <Input placeholder="Region/City..." value={form.region} onChange={u('region')} disabled={isReadOnly} />
                            </div>
                        </div>

                        {/* Editable fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest">Type Of Order</label>
                                <Select value={form.typeOfOrder} onChange={u('typeOfOrder')} disabled={isReadOnly}>
                                    <option value="">Select...</option>
                                    {TYPE_OF_ORDER.map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest">Sales Platform</label>
                                <Select value={form.salesPlatform} onChange={u('salesPlatform')} disabled={isReadOnly}>
                                    <option value="">Select...</option>
                                    {SALES_PLATFORM.map(p => <option key={p} value={p}>{p}</option>)}
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest">Issue / Description</label>
                            <textarea
                                placeholder="Describe the inquiry..."
                                value={form.issue}
                                onChange={u('issue')}
                                rows={2}
                                disabled={isReadOnly}
                                className="w-full rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium resize-none shadow-inner disabled:opacity-70 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest">Order Created?</label>
                            <div className={`flex gap-2 ${isReadOnly ? 'pointer-events-none' : ''}`}>
                                {(['Yes', 'No'] as const).map(opt => (
                                    <label key={opt} className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-xs font-semibold cursor-pointer transition-all ${form.order === opt
                                            ? opt === 'Yes' ? 'border-green-500 bg-green-500/10 text-green-700' : 'border-red-500 bg-red-500/10 text-red-700'
                                            : 'border-gray-100 hover:border-primary/50 text-gray-400'
                                        } ${isReadOnly && form.order !== opt ? 'opacity-30' : ''}`}>
                                        <input type="radio" name="order" value={opt} checked={form.order === opt} onChange={() => !isReadOnly && setForm(p => ({ ...p, order: opt }))} className="sr-only" />
                                        <span>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest">Status</label>
                                <Select value={form.status} onChange={u('status')} disabled={isReadOnly}>
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest">Outcome</label>
                                <Input placeholder="Outcome reason..." value={form.reason} onChange={u('reason')} disabled={isReadOnly} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest">Private Notes</label>
                            <textarea
                                placeholder="Additional notes..."
                                value={form.notes}
                                onChange={u('notes')}
                                rows={2}
                                disabled={isReadOnly}
                                className="w-full rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium resize-none shadow-inner disabled:opacity-70 cursor-not-allowed"
                            />
                        </div>

                        {error && <p className="text-[11px] font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>}
                    </form>
                </DialogBody>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        {isReadOnly ? 'Close' : 'Cancel'}
                    </Button>
                    {!isReadOnly && (
                        <Button type="submit" form="edit-lead-form" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
