'use client';
import { Package, CheckCircle2, Clock, XCircle, User, Building2 } from 'lucide-react';

export interface PurchaseOrderItem {
    priceListId: any;
    itemName?: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface PurchaseOrder {
    _id: string;
    poNumber: string;
    supplierName: string;
    items: PurchaseOrderItem[];
    totalAmount: number;
    status: 'PendingFinance' | 'ApprovedFinance' | 'Received' | 'Rejected';
    createdBy: { _id: string; firstName: string; lastName: string };
    financeApprovedBy?: { _id: string; firstName: string; lastName: string };
    financeApprovedAt?: string;
    receivedBy?: { _id: string; firstName: string; lastName: string };
    receivedAt?: string;
    createdAt: string;
}

export const poColumns = [
    {
        key: 'poNumber',
        header: 'PO #',
        className: 'md:w-[1%] md:whitespace-nowrap',
        render: (row: PurchaseOrder) => (
            <span className="font-black text-[hsl(var(--primary))]">{row.poNumber}</span>
        ),
    },
    {
        key: 'supplierName',
        header: 'Supplier',
        className: 'md:w-auto md:max-w-[150px] md:truncate',
        render: (row: PurchaseOrder) => (
            <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                <span className="font-semibold text-sm">{row.supplierName}</span>
            </div>
        ),
    },
    {
        key: 'status',
        header: 'Status',
        className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: PurchaseOrder) => {
            const statusMap: Record<string, { label: string, cls: string, icon: any }> = {
                PendingFinance: { label: 'Pending Approval', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
                ApprovedFinance: { label: 'Approved (Pending Receipt)', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
                Received: { label: 'Received (Stock In)', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
                Rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
            };
            const s = statusMap[row.status] || { label: row.status, cls: 'bg-gray-100', icon: Clock };
            return (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit ${s.cls}`}>
                    <s.icon className="w-3 h-3" />
                    {s.label}
                </span>
            );
        },
    },
    {
        key: 'totalAmount',
        header: 'Total Value',
        className: 'md:w-1/6 md:max-w-[120px] md:truncate font-mono',
        render: (row: PurchaseOrder) => (
            <span className="font-bold text-sm">
                ${row.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
        ),
    },
    {
        key: 'createdBy',
        header: 'Created By',
        render: (row: PurchaseOrder) => (
            <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-gray-400" />
                <span className="text-xs">{row.createdBy?.firstName} {row.createdBy?.lastName}</span>
            </div>
        ),
    }
];
