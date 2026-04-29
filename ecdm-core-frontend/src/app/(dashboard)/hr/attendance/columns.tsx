import { Clock } from 'lucide-react';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface AttendanceRecord {
    _id: string;
    employeeId: string;
    userId?: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        workStartTime?: string;
        workEndTime?: string;
        gracePeriod?: number;
        halfDayThreshold?: number;
    };
    name: string;
    department: string;
    date: string;
    day: string;
    checkIn: string;
    checkOut: string;
    status: 'Present' | 'Absent' | 'Late' | 'Half-day' | 'Leave' | '';
    notes: string;
    uploadedBy?: {
        firstName: string;
        lastName: string;
    };
    createdAt: string;
}

// Status badge styles
const STATUS_STYLES: Record<string, string> = {
    Present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    Absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
    Late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
    'Half-day': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
    Leave: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
    '': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES['']}`}>
        {status || 'N/A'}
    </span>
);

// Column definitions
export const columns = [
    {
        key: 'employeeId',
        header: 'Employee ID',
      className: 'md:w-[1%] md:whitespace-nowrap',
        render: (row: AttendanceRecord) => (
            <span className="font-mono text-sm">{row.employeeId}</span>
        ),
    },
    {
        key: 'name',
        header: 'Name',
      className: 'md:w-auto md:max-w-[200px]',
        render: (row: AttendanceRecord) => (
            <div className="flex flex-col">
                {row.userId ? (
                    <Link 
                        href={`/hr/users/${row.userId._id}`}
                        className="font-semibold text-primary hover:underline decoration-primary/30 underline-offset-4 transition-all"
                    >
                        {/* Prioritize System Profile Name over Excel-provided name */}
                        {row.userId.firstName} {row.userId.lastName}
                        {row.name && row.name !== `${row.userId.firstName} ${row.userId.lastName}` && row.name !== row.employeeId && (
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground italic">
                                ({row.name})
                            </span>
                        )}
                    </Link>
                ) : (
                    <span className="font-semibold text-muted-foreground">{row.name} (Unlinked)</span>
                )}
                {row.userId && (
                    <div className="flex flex-col gap-0.5 mt-1">
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">
                                Shift: {row.userId.workStartTime || '09:00'} - {row.userId.workEndTime || '17:00'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-70">
                            <div className="w-1 h-1 rounded-full bg-blue-400" />
                            <span className="text-[8px] font-medium uppercase tracking-tighter text-muted-foreground">
                                Rules: {row.userId.gracePeriod || 15}m Grace | {row.userId.halfDayThreshold || 4.5}h Half-day
                            </span>
                        </div>
                    </div>
                )}
            </div>
        ),
    },
    {
        key: 'department',
        header: 'Department',
        className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: AttendanceRecord) => row.department || '—',
    },
    {
        key: 'date',
        header: 'Date',
        className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: AttendanceRecord) => (
            <span className="whitespace-nowrap">
                {new Date(row.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                })}
            </span>
        ),
    },
    {
        key: 'day',
        header: 'Day',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: AttendanceRecord) => row.day || '—',
    },
    {
        key: 'checkIn',
        header: 'Check In',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: AttendanceRecord) => (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                {row.checkIn ? (
                    <>
                        <Clock className="h-3 w-3" />
                        {row.checkIn}
                    </>
                ) : '—'}
            </span>
        ),
    },
    {
        key: 'checkOut',
        header: 'Check Out',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: AttendanceRecord) => (
            <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                {row.checkOut ? (
                    <>
                        <Clock className="h-3 w-3" />
                        {row.checkOut}
                    </>
                ) : '—'}
            </span>
        ),
    },
    {
        key: 'status',
        header: 'Status',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: AttendanceRecord) => <StatusBadge status={row.status} />,
    },
    {
        key: 'notes',
        header: 'Notes',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
        render: (row: AttendanceRecord) => (
            <div className="max-w-[120px] truncate text-gray-500" title={row.notes}>
                {row.notes || '—'}
            </div>
        ),
    },
];

