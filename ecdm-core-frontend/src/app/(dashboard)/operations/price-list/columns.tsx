'use client';
import { API_BASE_URL } from '@/lib/constants';
import { Download, Edit2, Eye, FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Price List Data Table — Column Definitions
 *
 * Column shape expected by <DataTable>:
 *   { key: string; header: string; render?: (row, meta?) => ReactNode }
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceListItem {
    _id: string;
    sparePartsId: string;
    itemName: string;
    specification: string;
    dataSheetUrl: string;
    dataSheetFileName: string;
    category: string;
    unitPrice: number;
    availableQuantity: number;
    minStockLevel: number;
    notes: string;
    createdAt: string;
    updatedAt: string;
}

export const PRICE_LIST_CATEGORIES = [
    'Maintenance',
    'General supply',
    'Supply and installation',
] as const;

export type PriceListCategory = (typeof PRICE_LIST_CATEGORIES)[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getFileUrl = (relativePath: string): string => {
    if (!relativePath) return '';
    const base = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    return `${base}${path}`;
};

const handleDownload = async (url: string, filename: string) => {
    try {
        const res = await fetch(url);
        const ct = res.headers.get('content-type');
        if (!res.ok || (ct && ct.includes('text/html'))) throw new Error('File not found');
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(a.href);
        toast.success('Downloaded successfully!');
    } catch {
        toast.error('Failed to download file');
    }
};

// ─── Category colour map ──────────────────────────────────────────────────────

const categoryColour: Record<string, string> = {
    'Maintenance': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'General supply': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Supply and installation': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

// ─── Column Definitions ───────────────────────────────────────────────────────

export const priceListColumns = [
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
        className: 'md:w-auto md:max-w-[180px] md:truncate',
        render: (row: PriceListItem) => (
            <span className="font-semibold text-sm">{row.itemName}</span>
        ),
    },
    {
        key: 'specification',
        header: 'Specification',
        className: 'md:w-1/6 md:max-w-[150px] md:truncate',
        render: (row: PriceListItem) => (
            <span className="truncate max-w-[200px] inline-block text-xs text-[hsl(var(--muted-foreground))]" title={row.specification}>
                {row.specification || '-'}
            </span>
        ),
    },
    {
        key: 'availableQuantity',
        header: 'Qty',
        className: 'md:w-1/6 md:max-w-[80px] md:truncate text-center',
        render: (row: PriceListItem) => {
            const isLow = (row.availableQuantity || 0) <= (row.minStockLevel || 5);
            return (
                <div className="flex flex-col items-center">
                    <span className={`font-black text-sm ${isLow ? 'text-red-500 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {row.availableQuantity || 0}
                    </span>
                    {isLow && (
                        <span className="text-[9px] uppercase font-black text-red-500 tracking-tighter leading-none">
                            Low
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        key: 'unitPrice',
        header: 'Price',
        className: 'md:w-1/6 md:max-w-[100px] md:truncate font-mono text-xs',
        render: (row: PriceListItem) =>
            row.unitPrice != null && row.unitPrice !== 0
                ? `$${Number(row.unitPrice).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                  })}`
                : '-',
    },
    {
        key: 'dataSheet',
        header: 'Docs',
        className: 'md:w-1/6 md:max-w-[100px] md:truncate',
        render: (row: PriceListItem) => {
            if (!row.dataSheetUrl) return <span className="text-[hsl(var(--muted-foreground))] text-[10px] uppercase">None</span>;
            const url = getFileUrl(row.dataSheetUrl);
            const name = row.dataSheetFileName || 'datasheet.pdf';
            return (
                <div className="flex items-center gap-1.5 justify-center">
                    <a href={url} target="_blank" rel="noreferrer" title="View" className="p-1 rounded hover:bg-blue-50 transition-colors">
                        <Eye className="w-3.5 h-3.5 text-blue-500" />
                    </a>
                    <button onClick={() => handleDownload(url, name)} title="Download" className="p-1 rounded hover:bg-green-50 transition-colors">
                        <Download className="w-3.5 h-3.5 text-green-500" />
                    </button>
                </div>
            );
        },
    },
    {
        key: 'category',
        header: 'Category',
        className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: PriceListItem) => (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${categoryColour[row.category] ?? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                {row.category || '-'}
            </span>
        ),
    },
    {
        key: 'notes',
        header: 'Notes',
        className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: PriceListItem) => (
            <span className="truncate max-w-[150px] inline-block text-[10px]" title={row.notes}>
                {row.notes || '-'}
            </span>
        ),
    },
];

// ─── Actions renderer ─────────────────────────────────────────────────────────

interface ActionsConfig {
    onEdit: (row: PriceListItem) => void;
    onDelete: (row: PriceListItem) => void;
}

export const createActionsRenderer =
    ({ onEdit, onDelete }: ActionsConfig) =>
    (row: PriceListItem) => (
        <div className="flex items-center gap-1 justify-end">
            <button onClick={() => onEdit(row)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Edit">
                <Edit2 className="w-3.5 h-3.5 text-primary" />
            </button>
            <button onClick={() => onDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
        </div>
    );
