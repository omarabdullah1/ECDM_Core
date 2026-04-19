'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { CheckCircle2, XCircle, Loader2, FileText, User, Calendar, CreditCard, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

interface InvoiceApprovalDialogProps {
    invoice: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function InvoiceApprovalDialog({ invoice, open, onOpenChange, onSuccess }: InvoiceApprovalDialogProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(invoice?.status || 'Pending');

    if (!invoice) return null;

    const handleUpdateStatus = async () => {
        setIsUpdating(true);
        try {
            await api.post(`/finance/invoices/${invoice._id}/approve`, { status: selectedStatus });
            toast.success(`Invoice status updated to ${selectedStatus}`);
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update invoice status');
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Paid':     return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'Canceled': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'Unpaid':   return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'Pending':  return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default:        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-8 pb-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">
                                    Invoice {invoice.invoiceNumber}
                                </DialogTitle>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Manage payment status and synchronization</p>
                            </div>
                        </div>
                        <Badge className={`${getStatusColor(invoice.status)} border rounded-full px-3 py-1 font-bold`}>
                            {invoice.status}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="p-8 pt-4 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-3">
                                <User size={12} />
                                Customer
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white text-lg">{invoice.customerId?.name || 'Unknown'}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{invoice.customerId?.email}</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-3">
                                <Calendar size={12} />
                                Billing Info
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white text-lg">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Order Ref: {invoice.salesOrderId?.invoiceNumber || '-'}</p>
                        </div>
                    </div>

                    {/* Status Dropdown Logic */}
                    <div className="bg-blue-600/5 border border-blue-600/10 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Payment Status Sync</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Changing status to 'Paid' will automatically update Order Finance.</p>
                            </div>
                            <div className="w-48">
                                <Select 
                                    value={selectedStatus} 
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="dark:bg-slate-900 font-bold"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Paid" className="text-emerald-600">Paid</option>
                                    <option value="Unpaid" className="text-amber-600">Unpaid</option>
                                    <option value="Canceled" className="text-rose-600">Canceled</option>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-5 py-3 text-left font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Description</th>
                                    <th className="px-5 py-3 text-center font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Qty</th>
                                    <th className="px-5 py-3 text-right font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {invoice.items?.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">{item.description}</td>
                                        <td className="px-5 py-4 text-center text-slate-500">{item.quantity}</td>
                                        <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">EGP {(item.quantity * item.unitPrice).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50/30 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800">
                                <tr className="bg-blue-600/5">
                                    <td colSpan={2} className="px-5 py-4 text-right font-bold text-blue-600 dark:text-blue-400">Grand Total</td>
                                    <td className="px-5 py-4 text-right font-black text-blue-700 dark:text-blue-300 text-lg">EGP {invoice.grandTotal?.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl border-transparent hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold"
                    >
                        Close
                    </Button>
                    <Button
                        disabled={isUpdating}
                        onClick={handleUpdateStatus}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 gap-2 px-8 font-bold"
                    >
                        {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                        Update Status
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
