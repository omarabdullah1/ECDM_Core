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
    salesRevenuePercent: number;
    region1: string;
    region2: string;
    region3: string;
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
                'Previous': 'bg-gray-100 text-gray-700',
                'Current': 'bg-green-100 text-green-700',
                'Future': 'bg-blue-100 text-blue-700',
            };
            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || ''}`}>
                    {status || '-'}
                </span>
            );
        },
    },
    {
        key: 'impressions',
        header: 'Impressions',
        render: (row: Campaign) => (
            <span className="font-mono">{row.impressions?.toLocaleString() || '0'}</span>
        ),
    },
    {
        key: 'conversions',
        header: 'Conversions',
        render: (row: Campaign) => (
            <span className="font-mono">{row.conversions?.toLocaleString() || '0'}</span>
        ),
    },
    {
        key: 'salesRevenuePercent',
        header: '% Sales Revenue',
        render: (row: Campaign) => (
            <span className="font-mono">{row.salesRevenuePercent || 0}%</span>
        ),
    },
    {
        key: 'region1',
        header: 'Region 1',
        render: (row: Campaign) => row.region1 || '-',
    },
    {
        key: 'nextSteps',
        header: 'Next Steps',
        render: (row: Campaign) => {
            const nextSteps = row.nextSteps;
            const stepColors: Record<string, string> = {
                'Analyse': 'bg-purple-100 text-purple-700',
                'Pause': 'bg-yellow-100 text-yellow-700',
                'Stop': 'bg-red-100 text-red-700',
                'Continue': 'bg-green-100 text-green-700',
            };
            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${stepColors[nextSteps] || ''}`}>
                    {nextSteps || '-'}
                </span>
            );
        },
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
        key: 'notes',
        header: 'Notes',
        render: (row: Campaign) => (
            <span className="truncate max-w-[120px] inline-block" title={row.notes}>
                {row.notes || '-'}
            </span>
        ),
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
