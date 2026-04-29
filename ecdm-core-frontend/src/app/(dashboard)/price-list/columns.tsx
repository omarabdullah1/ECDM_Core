'use client';
import { CheckCircle2, Clock, DollarSign, Edit2 } from 'lucide-react';

/**
 * Price List — Column Definitions
 */

export interface PriceListItem {
    _id: string;
    sparePartsId: string;
    itemName: string;
    specification: string;
    category: string;
    unitPrice: number;
    pendingUnitPrice: number;
    priceStatus: 'Pending' | 'Confirmed';
    priceConfirmedBy?: { firstName: string; lastName: string; fullName?: string } | string;
    priceConfirmedAt?: string;
    availableQuantity: number;
    createdAt: string;
    updatedAt: string;
}

// ─── Category colour map ──────────────────────────────────────────────────────

const categoryColour: Record<string, string> = {
    'Maintenance': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'General supply': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Supply and installation': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const statusStyles: Record<string, string> = {
    'Pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
    'Confirmed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700',
};

const formatEGP = (amount: number) => {
    return `EGP ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ─── Column Definitions ───────────────────────────────────────────────────────

export const getPriceListColumns = (showPending: boolean = false) => {
    const cols: any[] = [
        {
            key: 'sparePartsId',
            header: 'ID',
            className: 'md:w-[1%] md:whitespace-nowrap',
            render: (row: PriceListItem) => (
                <span className="font-bold text-[hsl(var(--primary))] text-xs">{row.sparePartsId}</span>
            ),
        },
        {
            key: 'itemName',
            header: 'Item Name',
            className: 'md:w-auto md:max-w-[200px] md:truncate',
            render: (row: PriceListItem) => (
                <span className="font-semibold text-sm">{row.itemName}</span>
            ),
        },
        {
            key: 'specification',
            header: 'Specification',
            className: 'md:w-1/6 md:max-w-[150px] md:truncate',
            render: (row: PriceListItem) => (
                <span className="truncate max-w-[180px] inline-block text-xs text-[hsl(var(--muted-foreground))]" title={row.specification}>
                    {row.specification || '-'}
                </span>
            ),
        },
        {
            key: 'category',
            header: 'Category',
            className: 'md:w-1/6 md:max-w-[130px] md:truncate',
            render: (row: PriceListItem) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${categoryColour[row.category] ?? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                    {row.category || '-'}
                </span>
            ),
        },
        {
            key: 'unitPrice',
            header: 'Current Price',
            className: 'md:w-1/6 md:max-w-[120px]',
            render: (row: PriceListItem) => (
                <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                        {row.unitPrice ? formatEGP(row.unitPrice) : '-'}
                    </span>
                </div>
            ),
        },
    ];

    if (showPending) {
        cols.push({
            key: 'pendingUnitPrice',
            header: 'Proposed Price',
            className: 'md:w-1/6 md:max-w-[120px]',
            render: (row: PriceListItem) => {
                if (!row.pendingUnitPrice || row.priceStatus !== 'Pending') {
                    return <span className="text-xs text-[hsl(var(--muted-foreground))]">—</span>;
                }
                return (
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                        <span className="font-bold text-sm text-amber-700 dark:text-amber-400">
                            {formatEGP(row.pendingUnitPrice)}
                        </span>
                    </div>
                );
            },
        });
    }

    cols.push({
        key: 'priceStatus',
        header: 'Status',
        className: 'md:w-[1%] md:whitespace-nowrap',
        render: (row: PriceListItem) => (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${statusStyles[row.priceStatus] ?? statusStyles['Confirmed']}`}>
                {row.priceStatus === 'Pending' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                {row.priceStatus || 'Confirmed'}
            </span>
        ),
    });

    return cols;
};

// ─── Actions renderer ─────────────────────────────────────────────────────────

interface ActionsConfig {
    onProposePrice?: (row: PriceListItem) => void;
    onConfirmPrice?: (row: PriceListItem) => void;
    canPropose: boolean;
    canConfirm: boolean;
}

export const createPriceActionsRenderer =
    ({ onProposePrice, onConfirmPrice, canPropose, canConfirm }: ActionsConfig) =>
    (row: PriceListItem) => (
        <div className="flex items-center gap-1 justify-end">
            {canPropose && onProposePrice && (
                <button
                    onClick={(e) => { e.stopPropagation(); onProposePrice(row); }}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-tight transition-all flex items-center gap-1"
                    title="Propose Price"
                >
                    <Edit2 className="w-3 h-3" />
                    Propose
                </button>
            )}
            {canConfirm && onConfirmPrice && row.priceStatus === 'Pending' && (
                <button
                    onClick={(e) => { e.stopPropagation(); onConfirmPrice(row); }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-tight transition-all flex items-center gap-1"
                    title="Confirm Price"
                >
                    <CheckCircle2 className="w-3 h-3" />
                    Confirm
                </button>
            )}
        </div>
    );
