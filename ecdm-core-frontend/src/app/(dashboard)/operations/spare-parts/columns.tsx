'use client';
import { Edit2, Trash2, Eye, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '@/lib/constants';

/**
 * Spare Parts Data Table - Column Definitions
 * 
 * Implements 7 columns as per CEO-approved specification:
 * 1. Spare Parts ID
 * 2. Item Name
 * 3. Specification
 * 4. Data Sheets (PDF View/Download)
 * 5. Category
 * 6. Unit Price
 * 7. Notes
 * 8. Actions (Edit/Delete)
 */

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface SparePart {
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

// ─────────────────────────────────────────────────────────────────────────────
// File URL Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert relative file path to full URL
 * @param relativePath - Path stored in DB (e.g., "/uploads/datasheets/file.pdf")
 * @returns Full URL to access the file
 */
const getFileUrl = (relativePath: string): string => {
    if (!relativePath) return '';
    
    // Safely remove /api and trailing slashes from the base URL
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    
    // Ensure the relative path starts with exactly one slash
    const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    
    // Construct the full URL
    const fullUrl = `${baseUrl}${cleanPath}`;
    
    console.log('🔗 Constructed file URL:', fullUrl);
    return fullUrl;
};

/**
 * Robust file download handler with error handling
 * @param url - Full URL of the file to download
 * @param filename - Desired filename for the download
 */
const handleDownload = async (url: string, filename: string) => {
    try {
        console.log('⬇️ Attempting download from:', url);
        
        const response = await fetch(url);
        const contentType = response.headers.get('content-type');
        
        console.log('📊 Response status:', response.status);
        console.log('📄 Content-Type:', contentType);
        
        // Guard: If not OK, or if the server returned an HTML error page instead of a file
        if (!response.ok || (contentType && contentType.includes('text/html'))) {
            throw new Error('File not found or invalid response from server');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        console.log('✅ Download successful:', filename);
        toast.success('File downloaded successfully!');
    } catch (err) {
        console.error('❌ Download failed:', err);
        toast.error('Failed to download file');
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Column Definitions Factory
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createSparePartColumns = (): any[] => [
    // Column 1: Spare Parts ID
    {
        accessorKey: 'sparePartsId',
        header: 'Spare Parts ID',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cell: ({ row }: { row: any }) => (
            <span className="font-bold text-[hsl(var(--primary))]">
                {row.original.sparePartsId}
            </span>
        ),
    },
    
    // Column 2: Item Name
    {
        accessorKey: 'itemName',
        header: 'Item Name',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cell: ({ row }: { row: any }) => (
            <span className="font-medium">{row.original.itemName}</span>
        ),
    },
    
    // Column 3: Specification
    {
        accessorKey: 'specification',
        header: 'Specification',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cell: ({ row }: { row: any }) => (
            <span
                className="truncate max-w-[200px] inline-block"
                title={row.original.specification}
            >
                {row.original.specification || '-'}
            </span>
        ),
    },
    
    // Column 4: Data Sheets (PDF View/Download)
    {
        id: 'dataSheet',
        header: 'Data Sheets',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cell: ({ row }: { row: any }) => {
            if (row.original.dataSheetUrl) {
                const fileUrl = getFileUrl(row.original.dataSheetUrl);
                const fileName = row.original.dataSheetFileName || 'datasheet.pdf';
                
                return (
                    <div className="flex items-center gap-2">
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="View Data Sheet"
                            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors"
                        >
                            <Eye className="w-4 h-4 text-blue-500" />
                        </a>
                        <button
                            onClick={() => handleDownload(fileUrl, fileName)}
                            title="Download Data Sheet"
                            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors"
                        >
                            <Download className="w-4 h-4 text-green-500" />
                        </button>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[100px]" title={fileName}>
                            <FileText className="w-3 h-3 inline mr-1" />
                            {fileName}
                        </span>
                    </div>
                );
            }
            return <span className="text-gray-400 text-xs">No File</span>;
        },
    },
    
    // Column 5: Category
    {
        accessorKey: 'category',
        header: 'Category',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cell: ({ row }: { row: any }) => (
            <span className="px-2 py-1 rounded-full bg-[hsl(var(--muted))] text-xs font-medium">
                {row.original.category || '-'}
            </span>
        ),
    },
    
    // Column 6: Unit Price
    {
        accessorKey: 'unitPrice',
        header: 'Unit Price',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cell: ({ row }: { row: any }) =>
            row.original.unitPrice
                ? `$${row.original.unitPrice.toLocaleString()}`
                : '-',
    },
    
    // Column 7: Notes
    {
        accessorKey: 'notes',
        header: 'Notes',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cell: ({ row }: { row: any }) => (
            <span
                className="truncate max-w-[150px] inline-block"
                title={row.original.notes}
            >
                {row.original.notes || '-'}
            </span>
        ),
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Actions Renderer Factory
// ─────────────────────────────────────────────────────────────────────────────

interface ActionsConfig {
    onEdit: (row: SparePart) => void;
    onDelete: (row: SparePart) => void;
}

export const createActionsRenderer = ({ onEdit, onDelete }: ActionsConfig) => {
    return (row: SparePart) => (
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
};

// ─────────────────────────────────────────────────────────────────────────────
// Default Export (Legacy Compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export const columns = createSparePartColumns();
