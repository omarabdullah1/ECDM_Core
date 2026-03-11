'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Archive } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { createSalesOrderColumns, type SalesOrder, createActionsRenderer } from '../order/columns';

export default function NonPotentialOrdersPage() {
    const Q_STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected', 'Revised'];
    const F_STATUSES = ['Pending', 'Won', 'Lost', 'Cancelled'];
    const TYPE_OF_ORDER = ['Maintenance', 'General supplies', 'Supply and installation'];

    const [rows, setRows] = useState<SalesOrder[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [fStatus, setFStatus] = useState('');
    const [fFinalStatus, setFFinalStatus] = useState('');
    const [fTypeOfOrder, setFTypeOfOrder] = useState('');
    const [loading, setLoading] = useState(true);
    const lim = 10; const tp = Math.ceil(total / lim);

    const fetch_ = useCallback(async () => {
        setLoading(true);
        try {
            const p: Record<string, string | number> = { page, limit: lim, onlyNotPotential: 'true' };
            if (fStatus) p.quotationStatus = fStatus;
            if (fFinalStatus) p.finalStatus = fFinalStatus;
            if (fTypeOfOrder) p.typeOfOrder = fTypeOfOrder;
            const { data } = await api.get('/sales/orders', { params: p });
            setRows(data.data.data);
            setTotal(data.data.pagination.total);
        } catch (error) {
            console.error("Failed to fetch non-potential orders", error);
        }
        setLoading(false);
    }, [page, fStatus, fFinalStatus, fTypeOfOrder]);

    useEffect(() => { fetch_(); }, [fetch_]);

    const columns = createSalesOrderColumns({
        onCreateQuotation: () => { },
    });

    // We can include view/history actions if desired, but for archive often read-only works best
    const renderActions = createActionsRenderer({
        onEdit: () => { }, // Disabled for archive (or we could point to a view-only modal)
        onDelete: () => { }, // Disabled to preserve history
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Archive className="h-7 w-7 text-red-800" />
                <div>
                    <h1 className="text-2xl font-bold text-red-800">Non-Potential Customers</h1>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Archive of leads and orders that were rejected or marked as not potential after the final follow-up.</p>
                </div>
            </div>

            <div className="flex gap-3 flex-wrap items-center">
                <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
                    <option value="">All Quotation Statuses</option>
                    {Q_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={fFinalStatus} onChange={e => { setFFinalStatus(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
                    <option value="">All Final Statuses</option>
                    {F_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={fTypeOfOrder} onChange={e => { setFTypeOfOrder(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
                    <option value="">All Order Types</option>
                    {TYPE_OF_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="overflow-x-auto">
                <DataTable
                    data={rows}
                    columns={columns}
                    loading={loading}
                    emptyMessage="No non-potential orders found."
                    page={page}
                    totalPages={tp}
                    totalItems={total}
                    itemsPerPage={lim}
                    onPageChange={setPage}
                    renderActions={renderActions}
                    defaultVisibility={{
                        'customer.address': false,
                        'customer.sector': false,
                        'initialIssue': false,
                        'orderIssue': false,
                        'createdAt': false,
                        'siteInspectionDate': false,
                        'isTechnicalInspectionRequired': false,
                        'notes': false,
                        'reasonOfQuotation': false,
                        'salesPlatform': false,
                        'typeOfOrder': false,
                        'followUpFirst': false,
                        'quotationStatusFirstFollowUp': false,
                    }}
                />
            </div>
        </div>
    );
}
