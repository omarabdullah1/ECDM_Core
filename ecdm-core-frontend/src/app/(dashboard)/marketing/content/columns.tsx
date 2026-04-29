'use client';
import { Edit2, Trash2, Eye, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '@/lib/constants';

/**
 * Content Tracker Data Table - Column Definitions
 * 
 * Comprehensive content management with file uploads
 */

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentTracker {
    _id: string;
    contentId: string;
    contentTitle: string;
    type: string;
    details: string;
    owner: string;
    status: string;
    postDate?: string;
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
    onEdit: (row: ContentTracker) => void;
    onDelete: (id: string) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnProps) => [
    {
        key: 'contentId',
        header: 'ID',
      className: 'md:w-[1%] md:whitespace-nowrap',
        render: (row: ContentTracker) => (
            <span className="font-mono text-xs">{row.contentId || '-'}</span>
        ),
    },
    {
        key: 'contentTitle',
        header: 'Content Title',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: ContentTracker) => (
            <span className="font-medium">{row.contentTitle}</span>
        ),
    },
    {
        key: 'type',
        header: 'Type',
      className: 'md:w-[1%] md:whitespace-nowrap',
        render: (row: ContentTracker) => row.type || '-',
    },
    {
        key: 'details',
        header: 'Details',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: ContentTracker) => (
            <span className="truncate max-w-[150px] inline-block" title={row.details}>
                {row.details || '-'}
            </span>
        ),
    },
    {
        key: 'owner',
        header: 'Owner',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: ContentTracker) => row.owner || '-',
    },
    {
        key: 'status',
        header: 'Status',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: ContentTracker) => {
            const status = row.status;
            const statusColors: Record<string, string> = {
                'New': 'bg-blue-100 text-blue-700',
                'In progress': 'bg-yellow-100 text-yellow-700',
                'Under review': 'bg-purple-100 text-purple-700',
                'Published': 'bg-green-100 text-green-700',
                'Suspended': 'bg-red-100 text-red-700',
                'Paused': 'bg-gray-100 text-gray-700',
            };
            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || ''}`}>
                    {status || '-'}
                </span>
            );
        },
    },
    {
        key: 'postDate',
        header: 'Post Date',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: ContentTracker) => {
            if (!row.postDate) return '-';
            try {
                const date = new Date(row.postDate);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            } catch {
                return '-';
            }
        },
    },
    {
        key: 'file',
        header: 'File',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: ContentTracker) => {
            const fileUrl = row.fileUrl;
            const fileName = row.fileName;
            
            if (!fileUrl) return <span className="text-gray-400">-</span>;
            
            const fullUrl = getFileUrl(fileUrl);
            
            return (
                <div className="flex flex-wrap items-center gap-2">
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
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: ContentTracker) => (
            <span className="truncate max-w-[120px] inline-block" title={row.notes}>
                {row.notes || '-'}
            </span>
        ),
    },
    {
        key: 'actions',
        header: 'Actions',
      className: 'md:w-[1%] md:whitespace-nowrap',
        render: (row: ContentTracker) => (
            <div className="flex flex-wrap items-center gap-2">
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

