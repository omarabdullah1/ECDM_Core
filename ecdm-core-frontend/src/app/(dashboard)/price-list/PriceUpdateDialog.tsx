'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Loader2, TrendingUp, ArrowRight } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import type { PriceListItem } from './columns';

interface PriceUpdateDialogProps {
    item: PriceListItem | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PriceUpdateDialog({
    item,
    isOpen,
    onClose,
    onSuccess,
}: PriceUpdateDialogProps) {
    const [newPrice, setNewPrice] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (item) {
            setNewPrice(
                item.priceStatus === 'Pending' && item.pendingUnitPrice
                    ? String(item.pendingUnitPrice)
                    : String(item.unitPrice || '')
            );
        }
    }, [item]);

    if (!item) return null;

    const formatEGP = (amount: number) => {
        return `EGP ${(amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const handleSubmit = async () => {
        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) {
            toast.error('Please enter a valid price');
            return;
        }

        setIsSaving(true);
        try {
            await api.patch(`/operations/inventory/price/${item._id}`, {
                pendingUnitPrice: price,
            });
            toast.success('Price proposal submitted successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to propose price:', error);
            toast.error(
                error.response?.data?.message || 'Failed to submit price proposal'
            );
        } finally {
            setIsSaving(false);
        }
    };

    const priceChanged =
        parseFloat(newPrice) !== item.unitPrice && !isNaN(parseFloat(newPrice));
    const priceDiff = priceChanged
        ? parseFloat(newPrice) - (item.unitPrice || 0)
        : 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl p-0 overflow-hidden">
                {/* Header */}
                <div className="relative h-24 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center px-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                                Propose Price
                            </DialogTitle>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {item.sparePartsId} • {item.itemName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Current price info */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Current Confirmed Price
                        </p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">
                            {item.unitPrice ? formatEGP(item.unitPrice) : 'Not set'}
                        </p>
                    </div>

                    {/* New price input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                            Proposed New Price (EGP)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                EGP
                            </span>
                            <input
                                type="number"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-14 pr-4 py-3 text-lg font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Price diff preview */}
                    {priceChanged && (
                        <div
                            className={`flex items-center justify-between p-3 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                                priceDiff > 0
                                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-700'
                                    : 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-700'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">
                                    {formatEGP(item.unitPrice || 0)}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {formatEGP(parseFloat(newPrice))}
                                </span>
                            </div>
                            <span
                                className={`text-xs font-black ${
                                    priceDiff > 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                }`}
                            >
                                {priceDiff > 0 ? '+' : ''}
                                {formatEGP(priceDiff)}
                            </span>
                        </div>
                    )}

                    {/* Info notice */}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center">
                        This price will require Admin confirmation before it takes effect.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving || !newPrice}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 text-sm"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Submit Proposal
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
