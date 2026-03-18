'use client';
import { API_BASE_URL } from '@/lib/constants';
import { Download, Edit2, Eye, FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Price List Data Table — Column Definitions
 *
 * Column shape expected by <DataTable>:
 *   { key: string; header: string; render?: (row, meta?) => ReactNode }
 *
 * Columns:
 *   1. Spare Parts ID
 *   2. Item Name
 *   3. Specification
 *   4. Data Sheets  (PDF view / download)
 *   5. Category     (colour-coded badge)
 *   6. Unit Price
 *   7. Notes
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
    'Maintenance':
        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'General supply':
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Supply and installation':
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

// ─── Column Definitions ───────────────────────────────────────────────────────

export const priceListColumns = [
    {
        key: 'sparePartsId',
        header: 'Spare Parts ID',
        render: (row: PriceListItem) => (
            <span className="font-bold text-[hsl(var(--primary))]">{row.sparePartsId}</span>
        ),
    },
    {
        key: 'itemName',
        header: 'Item Name',
        render: (row: PriceListItem) => (
            <span className="font-medium">{row.itemName}</span>
        ),
    },
    {
        key: 'specification',
        header: 'Specification',
        render: (row: PriceListItem) => (
            <span
                className="truncate max-w-[200px] inline-block"
                title={row.specification}
            >
                {row.specification || '-'}
            </span>
        ),
    },
    {
        key: 'dataSheet',
        header: 'Data Sheets',
        render: (row: PriceListItem) => {
            if (!row.dataSheetUrl) {
                return <span className="text-[hsl(var(--muted-foreground))] text-xs">No File</span>;
            }
            const url = getFileUrl(row.dataSheetUrl);
            const name = row.dataSheetFileName || 'datasheet.pdf';
            return (
                <div className="flex items-center gap-2">
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        title="View Data Sheet"
                        className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                        <Eye className="w-4 h-4 text-blue-500" />
                    </a>
                    <button
                        onClick={() => handleDownload(url, name)}
                        title="Download Data Sheet"
                        className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                        <Download className="w-4 h-4 text-green-500" />
                    </button>
                    <span
                        className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[100px] inline-flex items-center gap-1"
                        title={name}
                    >
                        <FileText className="w-3 h-3 shrink-0" />
                        {name}
                    </span>
                </div>
            );
        },
    },
    {
        key: 'category',
        header: 'Category',
        render: (row: PriceListItem) => (
            <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                    categoryColour[row.category] ??
                    'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                }`}
            >
                {row.category || '-'}
            </span>
        ),
    },
    {
        key: 'unitPrice',
        header: 'Unit Price',
        render: (row: PriceListItem) =>
            row.unitPrice != null && row.unitPrice !== 0
                ? `$${Number(row.unitPrice).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                  })}`
                : '-',
    },
    {
        key: 'notes',
        header: 'Notes',
        render: (row: PriceListItem) => (
            <span className="truncate max-w-[150px] inline-block" title={row.notes}>
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
        <div className="flex items-center gap-2">
            <button
                onClick={() => onEdit(row)}
                className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                title="Edit"
            >
                <Edit2 className="w-4 h-4 text-[hsl(var(--primary))]" />
            </button>
            <button
                onClick={() => onDelete(row)}
                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                title="Delete"
            >
                <Trash2 className="w-4 h-4 text-red-500" />
            </button>
        </div>
    );
