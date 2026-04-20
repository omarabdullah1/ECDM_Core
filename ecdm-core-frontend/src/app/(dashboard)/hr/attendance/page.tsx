'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { 
    Calendar, Upload, X, AlertCircle, CheckCircle, 
    FileSpreadsheet, FolderOpen, Users, UserCheck, UserX, Clock, Filter as FilterIcon, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface AttendanceFolder {
    _id: string; // Date in YYYY-MM-DD format
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
}

const inputClass = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

export default function AttendancePage() {
    const { user } = useAuthStore();
    const [folders, setFolders] = useState<AttendanceFolder[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Date Range Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Upload Dialog
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState('');
    
    const canUpload = user?.role && ['SuperAdmin', 'Manager', 'HR'].includes(user.role);

    const fetchFolders = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            
            const { data } = await api.get('/hr/attendance/folders', { params });
            setFolders(data.data.folders);
        } catch {
            toast.error('Failed to load attendance folders');
        }
        setLoading(false);
    };

    // Re-fetch whenever date filters change
    useEffect(() => {
        fetchFolders();
    }, [startDate, endDate]);

    // Handle file upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/csv',
            ];
            
            if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
                setUploadError('Please select a valid Excel (.xlsx, .xls) or CSV file');
                return;
            }
            
            setUploadFile(file);
            setUploadError('');
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) {
            setUploadError('Please select a file first');
            return;
        }

        setUploading(true);
        setUploadError('');

        try {
            const formData = new FormData();
            formData.append('file', uploadFile);

            const { data } = await api.post('/hr/attendance/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success(`Successfully uploaded ${data.data.uploaded} attendance records`);
            setUploadOpen(false);
            setUploadFile(null);
            fetchFolders(); // Refresh folders after upload
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setUploadError(error.response?.data?.message || 'Failed to upload file');
        }
        setUploading(false);
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/hr/attendance/template', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_template_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            toast.error('Failed to download template');
        }
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <PageHeader
                title="Attendance Folders"
                icon={Calendar}
                description={`${folders.length} date folders found`}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Date Range Filter */}
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                            <FilterIcon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                            <div className="flex flex-wrap items-center gap-2">
                                <label htmlFor="startDate" className="text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap font-medium">
                                    From:
                                </label>
                                <input 
                                    type="date" 
                                    id="startDate" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)} 
                                    className="px-2 py-1 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <label htmlFor="endDate" className="text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap font-medium">
                                    To:
                                </label>
                                <input 
                                    type="date" 
                                    id="endDate" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)} 
                                    className="px-2 py-1 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                                />
                            </div>
                            {(startDate || endDate) && (
                                <button 
                                    onClick={() => { setStartDate(''); setEndDate(''); }} 
                                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        {/* Upload Button */}
                        {canUpload && (
                            <button
                                onClick={() => setUploadOpen(true)}
                                className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 border-0 transition-all"
                            >
                                <Upload className="h-4 w-4" />
                                Upload Sheet
                            </button>
                        )}
                    </div>
                }
            />

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))] mx-auto mb-4"></div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading folders...</p>
                    </div>
                </div>
            )}

            {/* Folders Grid */}
            {!loading && folders.length === 0 && (
                <div className="text-center py-12 border border-dashed border-[hsl(var(--border))] rounded-xl">
                    <FolderOpen className="h-12 w-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
                    <p className="text-[hsl(var(--muted-foreground))]">No attendance folders found</p>
                </div>
            )}

            {!loading && folders.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {folders.map((folder) => (
                        <div
                            key={folder._id}
                            className="rounded-xl border border-[hsl(var(--border))] modern-glass-card premium-shadow animate-in-slide m-auto relative hover:shadow-lg transition-all duration-200 overflow-hidden"
                        >
                            {/* Card Header */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 border-b border-[hsl(var(--border))]">
                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold">
                                    <FolderOpen className="w-5 h-5" />
                                    <span className="text-sm">{formatDate(folder._id)}</span>
                                </div>
                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-mono">
                                    {folder._id}
                                </p>
                            </div>

                            {/* Card Content */}
                            <div className="p-4">
                                <div className="space-y-2.5 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                                            <Users className="w-4 h-4" /> Total
                                        </span>
                                        <span className="font-semibold">{folder.totalRecords}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                                        <span className="flex items-center gap-1.5">
                                            <UserCheck className="w-4 h-4" /> Present
                                        </span>
                                        <span className="font-semibold">{folder.presentCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                                        <span className="flex items-center gap-1.5">
                                            <UserX className="w-4 h-4" /> Absent
                                        </span>
                                        <span className="font-semibold">{folder.absentCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-yellow-600 dark:text-yellow-500">
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" /> Late
                                        </span>
                                        <span className="font-semibold">{folder.lateCount}</span>
                                    </div>
                                </div>

                                {/* Open Folder Button */}
                                <Link href={`/hr/attendance/${folder._id}`}>
                                    <button className="w-full mt-4 rounded-lg bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))]/80 px-4 py-2 text-sm font-medium transition-colors">
                                        Open Folder
                                    </button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Dialog */}
            {uploadOpen && (
                <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in transition-all">
                    <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] modern-glass-card m-auto relative premium-shadow animate-in-slide p-6 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="h-6 w-6 text-[hsl(var(--primary))]" />
                                <h2 className="text-lg font-bold">Upload Attendance Sheet</h2>
                            </div>
                            <button onClick={() => setUploadOpen(false)} className="hover:opacity-70">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="mb-6 p-4 rounded-xl bg-[hsl(var(--muted))]/50 text-sm">
                            <div className="flex items-center justify-between mb-4">
                                <p className="font-bold text-base">Instructions</p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 px-3 py-1.5 text-xs font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-all"
                                >
                                    <Download className="h-3 w-3" />
                                    Download Employee Template
                                </button>
                            </div>
                            <p className="font-semibold mb-2">Expected Excel columns:</p>
                            <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-1">
                                <li><strong>EmployeeID</strong> (required)</li>
                                <li><strong>Name</strong> (required)</li>
                                <li><strong>Department</strong></li>
                                <li><strong>Date</strong> (required)</li>
                                <li><strong>Day</strong></li>
                                <li><strong>Check In</strong></li>
                                <li><strong>Check Out</strong></li>
                                <li><strong>Status</strong> (Present, Absent, Late, Half-day, Leave)</li>
                                <li><strong>Notes</strong></li>
                            </ul>
                        </div>

                        {/* File Input */}
                        <div className="mb-6">
                            <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-8 text-center hover:border-[hsl(var(--primary))]/50 transition-colors">
                                <Upload className="h-10 w-10 mx-auto mb-3 text-[hsl(var(--muted-foreground))]" />
                                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
                                    Drag & drop or click to select an Excel/CSV file
                                </p>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="attendance-file"
                                />
                                <label
                                    htmlFor="attendance-file"
                                    className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium cursor-pointer hover:bg-[hsl(var(--secondary))]/80"
                                >
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Select File
                                </label>
                            </div>
                            
                            {uploadFile && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-[hsl(var(--primary))]">
                                    <CheckCircle className="h-4 w-4" />
                                    {uploadFile.name}
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {uploadError && (
                            <div className="mb-4 flex items-center gap-2 text-sm text-red-500">
                                <AlertCircle className="h-4 w-4" />
                                {uploadError}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setUploadOpen(false)}
                                className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!uploadFile || uploading}
                                className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
                            >
                                {uploading ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        Upload
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
