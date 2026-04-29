'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    FileText, 
    Search, 
    RefreshCw, 
    Loader2, 
    Eye, 
    CheckCircle2, 
    XCircle, 
    Clock,
    Filter,
    CreditCard,
    CircleSlash
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import InvoiceApprovalDialog from './InvoiceApprovalDialog';

export default function InvoicesPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchInvoices = async (page = 1) => {
        setIsRefreshing(true);
        try {
            const params: any = { page, limit: 10 };
            if (searchTerm) params.search = searchTerm;
            if (statusFilter !== 'all') params.status = statusFilter;

            const response = await api.get('/finance/invoices', { params });
            const result = response.data?.data || response.data;
            
            setInvoices(result.data || []);
            setPagination(result.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
        } catch (error: any) {
            toast.error('Failed to load invoices');
            console.error(error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchInvoices(pagination.page);
    }, [pagination.page, statusFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchInvoices(1);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Paid':           return <CheckCircle2 size={12} />;
            case 'Partially Paid': return <Clock size={12} className="text-blue-500" />;
            case 'Canceled':       return <XCircle size={12} />;
            case 'Pending':        return <CircleSlash size={12} />;
            case 'Unpaid':         return <CreditCard size={12} />;
            default:               return null;
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Paid':           return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'Partially Paid': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Canceled':       return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'Unpaid':         return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'Pending':        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            default:               return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    return (
        <div className="space-y-6 pb-8 animate-in-fade">
            <PageHeader 
                title="Finance Invoices"
                description="Manage and synchronize customer invoices"
                icon={FileText}
                actions={
                    <Button 
                        variant="outline" 
                        onClick={() => fetchInvoices(pagination.page)}
                        disabled={isRefreshing}
                        className="rounded-xl border-[hsl(var(--border))]/50 gap-2 hover:bg-[hsl(var(--muted))] transition-all"
                    >
                        {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Refresh List
                    </Button>
                }
            />

            <div className="px-6 space-y-4">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <form onSubmit={handleSearch} className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] h-4 w-4" />
                        <input 
                            type="text"
                            placeholder="Search by invoice number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))]/50 focus:ring-2 focus:ring-[hsl(var(--primary))]/20 outline-none transition-all text-sm"
                        />
                    </form>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter size={14} className="text-[hsl(var(--muted-foreground))]" />
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 px-3 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))]/50 outline-none text-sm transition-all focus:ring-2 focus:ring-[hsl(var(--primary))]/20 min-w-[140px]"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Partially Paid">Partially Paid</option>
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Canceled">Canceled</option>
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                <div className="rounded-2xl border border-[hsl(var(--border))]/30 bg-[hsl(var(--background))]/30 backdrop-blur-md overflow-hidden premium-shadow">
                    <div className="w-full overflow-x-auto custom-table-scrollbar">
        <table className="w-full text-sm">
                            <thead className="bg-[hsl(var(--muted))]/50 border-b border-[hsl(var(--border))]/30">
                                <tr>
                                    <th className="px-5 py-4 text-left font-bold uppercase tracking-wider text-xs">Invoice #</th>
                                    <th className="px-5 py-4 text-left font-bold uppercase tracking-wider text-xs">Customer</th>
                                    <th className="px-5 py-4 text-left font-bold uppercase tracking-wider text-xs">Date</th>
                                    <th className="px-5 py-4 text-right font-bold uppercase tracking-wider text-xs">Grand Total</th>
                                    <th className="px-5 py-4 text-center font-bold uppercase tracking-wider text-xs">Status</th>
                                    <th className="px-5 py-4 text-right font-bold uppercase tracking-wider text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--border))]/20">
                                {isLoading ? (
                                    <tr className="border-0">
                                        <td colSpan={6} className="p-0">
                                            <TableSkeleton rows={5} columns={6} height="h-16" />
                                        </td>
                                    </tr>
                                ) : invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 text-[hsl(var(--muted-foreground))]">
                                                <FileText size={48} className="opacity-20" />
                                                <p className="text-sm font-medium">No invoices found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv) => (
                                        <tr 
                                            key={inv._id} 
                                            className="hover:bg-[hsl(var(--muted))]/20 transition-all duration-300 cursor-pointer group"
                                            onClick={() => {
                                                setSelectedInvoice(inv);
                                                setIsDialogOpen(true);
                                            }}
                                        >
                                            <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-bold text-[hsl(var(--primary))]">
                                                {inv.invoiceNumber}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-[hsl(var(--foreground))]">{inv.customerId?.name || 'Unknown'}</span>
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold">{inv.customerId?.customerId}</span>
                                                        {inv.salesOrderId?.salesOrderId && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-[hsl(var(--border))]"></span>
                                                                <span className="text-[10px] text-blue-500 font-black uppercase">{inv.salesOrderId.salesOrderId}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-[hsl(var(--muted-foreground))]">
                                                {new Date(inv.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-right font-black text-[hsl(var(--foreground))]">
                                                EGP {inv.grandTotal?.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-center">
                                                <Badge className={`${getStatusBadgeClass(inv.status)} border rounded-full px-3 py-0.5 gap-1.5 font-medium`}>
                                                    {getStatusIcon(inv.status)}
                                                    {inv.status}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedInvoice(inv);
                                                        setIsDialogOpen(true);
                                                    }}
                                                    className="rounded-xl hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))] transition-all"
                                                >
                                                    <Eye size={16} />
                                                    <span className="sr-only">View Details</span>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {!isLoading && invoices.length > 0 && (
                    <Pagination 
                        currentPage={pagination.page}
                        totalItems={pagination.total}
                        itemsPerPage={pagination.limit}
                        onPageChange={(page) => fetchInvoices(page)}
                    />
                )}
            </div>

            {selectedInvoice && (
                <InvoiceApprovalDialog 
                    invoice={selectedInvoice}
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSuccess={() => fetchInvoices(pagination.page)}
                />
            )}
        </div>
    );
}

