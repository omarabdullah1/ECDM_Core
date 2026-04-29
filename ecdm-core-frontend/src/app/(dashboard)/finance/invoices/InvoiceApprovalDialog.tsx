import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    FileText, 
    User, 
    Calendar, 
    CreditCard, 
    RefreshCcw, 
    History,
    PlusCircle,
    DollarSign,
    ChevronRight,
    Search,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

interface InvoiceApprovalDialogProps {
    invoice: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    readOnly?: boolean;
}

export default function InvoiceApprovalDialog({ invoice: initialInvoice, open, onOpenChange, onSuccess, readOnly = false }: InvoiceApprovalDialogProps) {
    const [internalPreviewMode, setInternalPreviewMode] = useState(true);
    const [invoice, setInvoice] = useState(initialInvoice);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isRecordingPayment, setIsRecordingPayment] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(initialInvoice?.status || 'Pending');
    
    // Payment Form State
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentNotes, setPaymentNotes] = useState('');

    useEffect(() => {
        if (initialInvoice) {
            setInvoice(initialInvoice);
            setSelectedStatus(initialInvoice.status);
            setPaymentAmount('');
            setPaymentNotes('');
        }
    }, [initialInvoice]);

    if (!invoice) return null;

    const effectivelyReadOnly = readOnly || internalPreviewMode;
    const remainingBalance = Math.max(0, (invoice.grandTotal || 0) - (invoice.paidAmount || 0));

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

    const handleRecordPayment = async () => {
        if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
            return toast.error('Please enter a valid payment amount');
        }

        if (Number(paymentAmount) > remainingBalance + 0.01) {
            return toast.error('Payment amount exceeds remaining balance');
        }

        setIsRecordingPayment(true);
        try {
            const { data } = await api.post(`/finance/invoices/${invoice._id}/payments`, {
                amount: Number(paymentAmount),
                method: paymentMethod,
                notes: paymentNotes
            });
            
            setInvoice(data.data || data); // Update local invoice object
            setPaymentAmount('');
            setPaymentNotes('');
            toast.success('Payment recorded successfully');
            onSuccess(); // Refresh main list
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to record payment');
        } finally {
            setIsRecordingPayment(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Paid':           return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'Partially Paid': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Canceled':       return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'Unpaid':         return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'Pending':        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            default:               return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const paidPercentage = Math.min(100, Math.round(((invoice.paidAmount || 0) / (invoice.grandTotal || 1)) * 100));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modern Header */}
                <div className="relative h-32 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center px-8 shrink-0">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <DollarSign size={80} className="text-white" />
                    </div>
                    <div className="flex items-center gap-5 z-10">
                        <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-white tracking-tight">Invoice {invoice.invoiceNumber}</h2>
                            <div className="flex items-center gap-3">
                                <Badge className={`${getStatusColor(invoice.status)} text-[10px] uppercase tracking-widest px-2.5 py-0.5 border-0 bg-white/10 backdrop-blur-md text-white font-black`}>
                                    {invoice.status}
                                </Badge>
                                <span className="text-xs text-slate-300 font-medium">Created: {new Date(invoice.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Left Side: Details & History */}
                    <div className={`flex-[1.2] overflow-y-auto custom-scrollbar p-8 pt-6 space-y-8 ${effectivelyReadOnly ? '' : 'border-r'} border-slate-100 dark:border-slate-800/50`}>
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                                <p className="font-bold text-slate-900 dark:text-white truncate">{invoice.customerId?.name || 'Unknown'}</p>
                                <p className="text-[11px] text-slate-500 font-medium truncate">{invoice.customerId?.email || 'No email provided'}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Order</p>
                                <p className="font-bold text-slate-900 dark:text-white">{invoice.salesOrderId?.salesOrderId || 'Independent'}</p>
                                <p className="text-[11px] text-blue-500 font-black uppercase tracking-tighter">FINANCE SYNC ACTIVE</p>
                            </div>
                        </div>

                        {/* Balance Overview */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <CreditCard size={14} className="text-blue-500" /> Payment Progress
                                </h4>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{paidPercentage}% Settled</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full shadow-lg transition-all duration-1000 ease-out relative"
                                    style={{ width: `${paidPercentage}%` }}
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[move_2s_linear_infinite]"></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-1">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Total</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">EGP {invoice.grandTotal?.toLocaleString()}</p>
                                </div>
                                <div className="text-center border-x border-slate-100 dark:border-slate-800">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Paid</p>
                                    <p className="text-sm font-bold text-emerald-600">EGP {invoice.paidAmount?.toLocaleString() || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Remaining</p>
                                    <p className="text-sm font-bold text-rose-600">EGP {remainingBalance?.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment History Ledger */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <History size={14} className="text-orange-500" /> Payment History Ledger
                            </h4>
                            <div className="space-y-2.5">
                                {invoice.payments && invoice.payments.length > 0 ? (
                                    invoice.payments.map((p: any, idx: number) => (
                                        <div key={p._id || idx} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                                    <DollarSign size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">EGP {p.amount?.toLocaleString()}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{new Date(p.date).toLocaleDateString()} • {p.method}</p>
                                                </div>
                                            </div>
                                            {p.notes && (
                                                <div className="max-w-[150px] truncate text-[10px] italic text-slate-400 group-hover:text-slate-300 transition-colors">
                                                    "{p.notes}"
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-3 opacity-50 bg-slate-50/50 dark:bg-slate-800/20">
                                        <RefreshCcw size={32} className="text-slate-300 animate-spin-slow" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">No payment history recorded yet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Preview */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Invoiced Items</h4>
                            <div className="rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/50 overflow-x-auto custom-table-scrollbar modern-glass-card">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800/50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left font-black text-slate-400 uppercase tracking-tighter">Description</th>
                                            <th className="px-4 py-2.5 text-center font-black text-slate-400 uppercase tracking-tighter w-16">Qty</th>
                                            <th className="px-4 py-2.5 text-right font-black text-slate-400 uppercase tracking-tighter w-24">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                                        {invoice.items?.map((item: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{item.description}</td>
                                                <td className="px-4 py-2.5 text-center text-slate-500 font-medium">{item.quantity}</td>
                                                <td className="px-4 py-2.5 text-right font-black text-slate-900 dark:text-white">EGP {(item.quantity * item.unitPrice).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Recording Form */}
                    {!effectivelyReadOnly && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-800/20 p-8 space-y-8 animate-in slide-in-from-right duration-300">
                            {/* Status Change Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <RefreshCcw size={16} className="text-blue-500" />
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Quick Status Actions</h4>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/10 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Update Invoice Status</label>
                                        <Select 
                                            value={selectedStatus} 
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-black text-xs h-11"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Partially Paid">Partially Paid</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Unpaid">Unpaid</option>
                                            <option value="Canceled">Canceled</option>
                                        </Select>
                                    </div>
                                    <Button
                                        disabled={isUpdating || selectedStatus === invoice.status}
                                        onClick={handleUpdateStatus}
                                        className="w-full rounded-2xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 h-11 font-black transition-all shadow-lg text-xs"
                                    >
                                        {isUpdating ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Status Update'}
                                    </Button>
                                </div>
                            </div>

                            {/* Add Payment Form */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <PlusCircle size={16} className="text-emerald-500" />
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Record New Payment</h4>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-emerald-500/10 shadow-2xl shadow-emerald-500/5 space-y-5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Amount (EGP)</label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder={`Remaining: ${remainingBalance}`}
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-12 font-black text-lg pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 transition-all rounded-2xl"
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">EGP</div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                                        <Select 
                                            value={paymentMethod} 
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-black text-xs h-11"
                                        >
                                            <option value="Cash">Cash (Hand-over)</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Cheque">Cheque / Promissory</option>
                                            <option value="Credit Card">Credit Card / POS</option>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Optional Notes</label>
                                        <textarea
                                            value={paymentNotes}
                                            onChange={(e) => setPaymentNotes(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs min-h-[80px] focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                                            placeholder="Note relevant tracking info..."
                                        />
                                    </div>

                                    <Button
                                        disabled={isRecordingPayment || !paymentAmount}
                                        onClick={handleRecordPayment}
                                        className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white h-12 font-black transition-all shadow-lg shadow-emerald-500/20 text-sm gap-2"
                                    >
                                        {isRecordingPayment ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                        Record Payment Partialy
                                    </Button>
                                    
                                    <div className="flex items-center gap-2 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 mt-2">
                                        <AlertCircle size={14} className="text-blue-500 shrink-0" />
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-tight">
                                            Recording a payment will automatically sync data to Finance modules and deduct inventory if needed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl px-8 h-11 text-xs font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest"
                    >
                        {effectivelyReadOnly ? 'Close Portal' : 'Cancel'}
                    </Button>
                    {effectivelyReadOnly && (
                        <Button
                            key="btn-edit" onClick={(e) => { e.preventDefault(); setInternalPreviewMode(false); }}
                            className="rounded-xl px-8 h-11 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition-all uppercase tracking-widest shadow-lg active:scale-95"
                        >
                            Open Actions & Payments
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
            
            <style jsx global>{`
                @keyframes move {
                    0% { background-position: 0 0; }
                    100% { background-position: 2rem 0; }
                }
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
            `}</style>
        </Dialog>
    );
}

