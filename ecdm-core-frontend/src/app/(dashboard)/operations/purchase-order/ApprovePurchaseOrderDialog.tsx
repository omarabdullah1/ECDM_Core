'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import type { PurchaseOrder } from './columns';
import { CheckCircle2, Building2, Package, X } from 'lucide-react';

interface ApprovePurchaseOrderDialogProps {
    po: PurchaseOrder;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ApprovePurchaseOrderDialog({ po, onClose, onSuccess }: ApprovePurchaseOrderDialogProps) {
    const [supplierName, setSupplierName] = useState(po.supplierName || '');
    const [items, setItems] = useState(po.items.map(i => ({
        ...i,
        unitPrice: i.unitPrice || 0
    })));
    const [saving, setSaving] = useState(false);

    const updateItemPrice = (idx: number, price: number) => {
        const newItems = [...items];
        newItems[idx].unitPrice = price;
        setItems(newItems);
    };

    const handleApprove = async () => {
        if (!supplierName) return toast.error('Supplier Name is required');
        if (items.some(i => !i.unitPrice || i.unitPrice <= 0)) {
            return toast.error('All items must have a valid unit price');
        }

        setSaving(true);
        try {
            // 1. Update the PO details
            await api.patch(`/operations/purchase-orders/${po._id}`, {
                supplierName,
                items: items.map(i => ({
                    inventoryId: i.inventoryId._id || i.inventoryId,
                    itemName: i.itemName,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice
                }))
            });

            // 2. Approve the PO
            await api.patch(`/operations/purchase-orders/${po._id}/finance-approve`);

            toast.success('Purchase Order Approved successfully!');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to approve PO');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-xl border-none shadow-2xl p-0 overflow-hidden flex flex-col z-[60]">
                <DialogHeader className="p-6 bg-emerald-50/50 border-b border-emerald-100 flex justify-between items-start relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                    <div className="relative z-10">
                        <DialogTitle className="text-xl font-black flex items-center gap-2 text-emerald-700">
                            <CheckCircle2 className="w-5 h-5" /> Add Details & Approve
                        </DialogTitle>
                        <p className="text-sm text-emerald-600/70 font-bold mt-1">PO #{po.poNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-full text-emerald-600/50 transition-colors relative z-10">
                        <X className="w-4 h-4" />
                    </button>
                </DialogHeader>
                <DialogBody className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" /> Supplier Name
                        </label>
                        <Input 
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            placeholder="Enter the supplier name"
                            className="font-bold border-gray-200 focus:border-emerald-500"
                        />
                    </div>
                    
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5" /> Items Cost
                        </label>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 transition-colors hover:border-emerald-100 hover:bg-emerald-50/30">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">{item.itemName || 'Item'}</p>
                                        <p className="text-[10px] text-gray-400 font-black uppercase">Qty: {item.quantity}</p>
                                    </div>
                                    <div className="w-40 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                        <Input 
                                            type="number"
                                            step="0.01"
                                            value={item.unitPrice || ''}
                                            onChange={(e) => updateItemPrice(idx, Number(e.target.value))}
                                            placeholder="Unit Price"
                                            className="pl-8 font-bold bg-white border-gray-200 focus:border-emerald-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogBody>
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleApprove}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 hover:scale-[1.02] transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                    >
                        {saving ? 'Approving...' : <><CheckCircle2 className="w-4 h-4" /> Submit & Approve</>}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
