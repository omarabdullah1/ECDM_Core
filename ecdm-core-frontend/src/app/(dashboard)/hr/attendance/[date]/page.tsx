'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { ArrowLeft, Calendar, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import { columns, AttendanceRecord } from '../columns';
import ViewAttendanceDialog from '../ViewAttendanceDialog';

export default function DailyAttendanceFolder() {
    const params = useParams();
    const router = useRouter();
    const dateStr = params.date as string;

    const [rows, setRows] = useState<AttendanceRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);

    const limit = 100; // Higher limit for single-day view
    const totalPages = Math.ceil(total / limit);

    const fetchDailyAttendance = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/hr/attendance', {
                params: {
                    date: dateStr,
                    page,
                    limit
                }
            });
            setRows(data.data.data);
            setTotal(data.data.pagination.total);
        } catch {
            toast.error('Failed to load attendance records');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (dateStr) {
            fetchDailyAttendance();
        }
    }, [dateStr, page]);

    const handleRowClick = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setViewDialogOpen(true);
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    // Calculate statistics
    const stats = {
        total: total,
        present: rows.filter(r => ['Present', 'Half-day'].includes(r.status)).length,
        absent: rows.filter(r => ['Absent', 'Leave', 'SickLeave', 'AnnualLeave'].includes(r.status)).length,
        late: rows.filter(r => r.status === 'Late').length,
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => router.back()}
                        className="mt-1 p-2 rounded-xl hover:bg-[hsl(var(--secondary))] transition-colors"
                        title="Back to Folders"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Calendar className="h-7 w-7 text-[hsl(var(--primary))]" />
                            <h1 className="text-2xl font-bold">Attendance Record</h1>
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] ml-10">
                            {formatDate(dateStr)}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono ml-10 mt-1">
                            {dateStr}
                        </p>
                    </div>
                </div>

                {/* Export Button (Optional) */}
                <button
                    className="flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))]/80 transition-colors"
                    onClick={() => toast('Export feature coming soon')}
                >
                    <Download className="h-4 w-4" />
                    Export
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Total Records</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-1">Present</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.present}</p>
                </div>
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
                    <p className="text-sm text-red-600 dark:text-red-400 mb-1">Absent</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.absent}</p>
                </div>
                <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30 p-4">
                    <p className="text-sm text-yellow-600 dark:text-yellow-500 mb-1">Late</p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">{stats.late}</p>
                </div>
            </div>

            {/* Data Table */}
            <div className="w-full">
                <DataTable
                    data={rows}
                    columns={columns}
                    loading={loading}
                    emptyMessage={`No attendance records found for ${dateStr}`}
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    onRowClick={handleRowClick}
                    bulkDeleteEndpoint="/hr/attendance/bulk-delete"
                    onBulkDeleteSuccess={fetchDailyAttendance}
                    defaultVisibility={{
                        employeeId: false,
                        department: false,
                        date: false,
                        day: false,
                        notes: false,
                    }}
                />
            </div>

            {/* Detail Dialog */}
            {selectedRecord && (
                <ViewAttendanceDialog
                    open={viewDialogOpen}
                    onOpenChange={setViewDialogOpen}
                    record={selectedRecord}
                    onSuccess={fetchDailyAttendance}
                />
            )}
        </div>
    );
}
