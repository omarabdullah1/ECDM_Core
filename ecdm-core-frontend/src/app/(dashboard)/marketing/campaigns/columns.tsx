'use client';
import { Edit2, Trash2, Eye, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '@/lib/constants';

/**
 * Campaign Results Data Table - Column Definitions
 * 
 * Comprehensive campaign tracking with file uploads
 */

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface Campaign {
    _id: string;
    campaignId: string;
    campaignName: string;
    status: string;
    impressions: number;
    conversions: number;
    salesRevenue: number; // Changed from salesRevenuePercent to salesRevenue (currency)
    salesRevenuePercent?: number; // Keep for backward compatibility
    region1: string;
    region2: string;
    region3: string;
    adSpend: number;
    cpa: number;
    roas: number;
    nextSteps: string;
    fileUrl: string;
    fileName: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// File URL Helper
// ─────────────────────────────────────────────────────────────────────────────

const getFileUrl = (relativePath: string): string => {
    if (!relativePath) return '';
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    return `${baseUrl}${cleanPath}`;
};

const handleDownload = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        const contentType = response.headers.get('content-type');
        
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
        toast.success('File downloaded successfully!');
    } catch (err) {
        console.error('❌ Download failed:', err);
        toast.error('Failed to download file');
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Column Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface ColumnProps {
    onEdit: (row: Campaign) => void;
    onDelete: (id: string) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnProps) => [
    {
        key: 'campaignId',
        header: 'ID',
        render: (row: Campaign) => (
            <span className="font-mono text-xs">{row.campaignId || '-'}</span>
        ),
    },
    {
        key: 'campaignName',
        header: 'Campaign',
        render: (row: Campaign) => (
            <span className="font-medium">{row.campaignName}</span>
        ),
    },
    {
        key: 'status',
        header: 'Status',
        render: (row: Campaign) => {
            const status = row.status;
            const statusColors: Record<string, string> = {
                'Previous': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                'Current': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                'Future': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            };
            return (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status] || ''}`}>
                    {status || 'Draft'}
                </span>
            );
        },
    },
    {
        key: 'impressions',
        header: 'Impressions',
        render: (row: Campaign) => (
            <span className="font-mono">{Number(row.impressions || 0).toLocaleString()}</span>
        ),
    },
    {
        key: 'conversions',
        header: 'Conversions',
        render: (row: Campaign) => (
            <span className="font-mono">{Number(row.conversions || 0).toLocaleString()}</span>
        ),
    },
    {
        key: 'salesRevenue',
        header: 'Sales Revenue',
        render: (row: Campaign) => (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                EGP {Number(row.salesRevenue || row.salesRevenuePercent || 0).toLocaleString()}
            </span>
        ),
    },
    {
        key: 'region1',
        header: 'Region 1',
        render: (row: Campaign) => row.region1 || '-',
    },
    {
        key: 'region2',
        header: 'Region 2',
        render: (row: Campaign) => row.region2 || '-',
    },
    {
        key: 'region3',
        header: 'Region 3',
        render: (row: Campaign) => row.region3 || '-',
    },
    {
        key: 'adSpend',
        header: 'Ad Spend',
        render: (row: Campaign) => (
            <span className="text-blue-600 dark:text-blue-400">
                EGP {Number(row.adSpend || 0).toLocaleString()}
            </span>
        ),
    },
    {
        key: 'cpa',
        header: 'CPA',
        render: (row: Campaign) => (
            <span className="font-mono">{Number(row.cpa || 0).toFixed(2)}</span>
        ),
    },
    {
        key: 'roas',
        header: 'ROAS',
        render: (row: Campaign) => (
            <span className="font-semibold">{Number(row.roas || 0).toFixed(2)}x</span>
        ),
    },
    {
        key: 'nextSteps',
        header: 'Next Steps',
        render: (row: Campaign) => {
            const nextSteps = row.nextSteps;
            const stepColors: Record<string, string> = {
                'Analyse': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                'Pause': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                'Stop': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                'Continue': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            };
            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${stepColors[nextSteps] || ''}`}>
                    {nextSteps || '-'}
                </span>
            );
        },
    },
    {
        key: 'notes',
        header: 'Notes',
        render: (row: Campaign) => (
            <span className="truncate max-w-[150px] inline-block" title={row.notes}>
                {row.notes || '-'}
            </span>
        ),
    },
    {
        key: 'file',
        header: 'File',
        render: (row: Campaign) => {
            const fileUrl = row.fileUrl;
            const fileName = row.fileName;
            
            if (!fileUrl) return <span className="text-gray-400">-</span>;
            
            const fullUrl = getFileUrl(fileUrl);
            
            return (
                <div className="flex items-center gap-2">
                    <a
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        title="View file"
                    >
                        <Eye size={16} />
                    </a>
                    <button
                        onClick={() => handleDownload(fullUrl, fileName || 'file')}
                        className="text-green-500 hover:text-green-700 transition-colors"
                        title="Download file"
                    >
                        <Download size={16} />
                    </button>
                    <FileText size={14} className="text-gray-400" />
                </div>
            );
        },
    },
    {
        key: 'actions',
        header: 'Actions',
        render: (row: Campaign) => (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onEdit(row)}
                    className="text-blue-500 hover:text-blue-700 transition-colors"
                    title="Edit"
                >
                    <Edit2 size={16} />
                </button>
                <button
                    onClick={() => onDelete(row._id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Delete"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        ),
    },
];
