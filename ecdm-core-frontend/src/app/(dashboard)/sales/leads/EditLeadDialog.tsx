'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { SalesLead, STATUSES, TYPE_OF_ORDER, SALES_PLATFORM, OrderOption, iCls } from './page';

interface EditLeadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    lead: SalesLead | null;
    onRequiresApproval: () => void;
}

const blankEdit: { issue: string; order: OrderOption; reason: string; notes: string; status: 'New' | 'Contacted' | 'Negotiation' | 'Closed'; address: string; region: string; typeOfOrder: string; salesPlatform: string } = { issue: '', order: '', reason: '', notes: '', status: 'New', address: '', region: '', typeOfOrder: '', salesPlatform: '' };

export function EditLeadDialog({ isOpen, onClose, onSuccess, lead, onRequiresApproval }: EditLeadDialogProps) {
    const [form, setForm] = useState(blankEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (lead && isOpen) {
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
            setError('');
        }
    }, [lead, isOpen]);

    const save = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!lead) return;

        setSaving(true);
        setError('');
        
        // Build payload - include all fields from form (don't filter by empty string)
        // This ensures status and other fields are always sent if they exist in form
        const pl: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(form)) {
            // Only exclude truly empty values, but keep 'New' status and other non-empty values
            if (v !== '' && v !== null && v !== undefined) {
                pl[k] = v;
            }
        }
        
        console.log('📤 Submitting lead update:', pl);
        try {
            const response = await api.patch(`/sales/leads/${lead._id}`, pl);

            console.log('🔍 API Response Status:', response.status);
            console.log('🔍 API Response Data:', response.data);

            // Extract smart update metadata from response
            const meta = response.data?.meta;
            const directUpdatesApplied = meta?.directUpdatesApplied || false;
            const modificationRequestCreated = meta?.modificationRequestCreated || false;

            // Handle different scenarios based on what happened
            if (response.status === 202) {
                // Status 202: Only modification request (all changes need approval)
                console.log('⏳ Edit intercepted by Maker-Checker - Pending approval');
                toast.success('Your changes modify existing data and have been submitted for admin approval.');
                setSaving(false);
                onRequiresApproval();
                return;
            } else if (response.status === 200) {
                // Status 200: Could be multiple scenarios
                if (directUpdatesApplied && modificationRequestCreated) {
                    // Both: Some fields updated directly, others need approval
                    console.log('✅ Mixed update: Direct + Modification Request');
                    toast.success('Empty fields saved directly. Changes to existing data were submitted for admin approval.', {
                        duration: 5000,
                    });
                } else if (directUpdatesApplied) {
                    // Only direct updates: All fields were empty before
                    console.log('✅ Direct updates only');
                    toast.success('Lead data saved successfully!');
                } else if (modificationRequestCreated) {
                    // Only modification request (shouldn't happen with 200, but handle it)
                    console.log('⏳ Modification request created');
                    toast.success('Your changes have been submitted for admin approval.');
                } else {
                    // No changes detected
                    console.log('ℹ️ No changes detected');
                    toast.success('No changes were made.');
                }

                onSuccess();
                onClose();
            } else {
                // Unexpected status code
                console.log('⚠️ Unexpected status:', response.status);
                toast.success('Lead updated successfully');
                onSuccess();
                onClose();
            }
        } catch (e: unknown) {
            const errorMessage = (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update lead';
            console.error('❌ Error updating lead:', errorMessage);
            setError(errorMessage);
            if (errorMessage.includes('Action already taken') || errorMessage.includes('Cannot revert')) {
                toast.error('Cannot cancel: Action has already been taken on this Sales Order');
            } else {
                toast.error(errorMessage);
            }
        }
        setSaving(false);
    };

    const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(p => ({ ...p, [f]: e.target.value }));

    if (!lead) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-6 outline-none">
                <DialogHeader className="mb-6 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <DialogTitle className="text-lg font-bold">Update Lead</DialogTitle>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{lead.customerId?.customerId} • {lead.customerId?.name || '-'}</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]"><X className="h-5 w-5" /></button>
                </DialogHeader>

                <form onSubmit={save} className="space-y-4">
                    {/* Read-only info */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[hsl(var(--muted))]/30 text-sm">
                        <div><span className="text-[hsl(var(--muted-foreground))]">Phone:</span> {lead.customerId?.phone || '-'}</div>
                        <div><span className="text-[hsl(var(--muted-foreground))]">Type:</span> {lead.customerId?.type || '-'}</div>
                        <div><span className="text-[hsl(var(--muted-foreground))]">Sector:</span> {lead.customerId?.sector || '-'}</div>
                        <div><span className="text-[hsl(var(--muted-foreground))]">Sales Person:</span> {lead.salesPerson || <em>Auto-assigned</em>}</div>
                    </div>

                    {/* Customer Fields (SSOT) - Editable */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Address</label>
                            <input placeholder="Customer address..." value={form.address} onChange={u('address')} className={iCls} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Region</label>
                            <input placeholder="Region/City..." value={form.region} onChange={u('region')} className={iCls} />
                        </div>
                    </div>

                    {/* Editable fields */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Type Of Order</label>
                            <select value={form.typeOfOrder} onChange={u('typeOfOrder')} className={iCls}>
                                <option value="">Select...</option>
                                {TYPE_OF_ORDER.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Sales Platform</label>
                            <select value={form.salesPlatform} onChange={u('salesPlatform')} className={iCls}>
                                <option value="">Select...</option>
                                {SALES_PLATFORM.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Issue / Description</label>
                        <textarea placeholder="Describe the customer's issue or inquiry..." value={form.issue} onChange={u('issue')} rows={2} className={iCls} />
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Order</label>
                        <div className="flex gap-2">
                            <label className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium cursor-pointer transition-all ${form.order === 'Yes'
                                    ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                                    : 'border-[hsl(var(--border))] hover:border-green-500/50'
                                }`}>
                                <input
                                    type="radio"
                                    name="order"
                                    value="Yes"
                                    checked={form.order === 'Yes'}
                                    onChange={() => setForm(p => ({ ...p, order: 'Yes' }))}
                                    className="sr-only"
                                />
                                <span>Yes</span>
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium cursor-pointer transition-all ${form.order === 'No'
                                    ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                                    : 'border-[hsl(var(--border))] hover:border-red-500/50'
                                }`}>
                                <input
                                    type="radio"
                                    name="order"
                                    value="No"
                                    checked={form.order === 'No'}
                                    onChange={() => setForm(p => ({ ...p, order: 'No' }))}
                                    className="sr-only"
                                />
                                <span>No</span>
                            </label>
                        </div>
                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                            Selecting &quot;Yes&quot; will create a Sales Order. Changing to &quot;No&quot; is only possible if no action has been taken on the order.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Reason / Outcome</label>
                        <input placeholder="Reason for status change or outcome..." value={form.reason} onChange={u('reason')} className={iCls} />
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Status</label>
                        <select value={form.status} onChange={u('status')} className={iCls}>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1 text-[hsl(var(--muted-foreground))]">Notes</label>
                        <textarea placeholder="Additional notes..." value={form.notes} onChange={u('notes')} rows={2} className={iCls} />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">
                            Cancel
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
