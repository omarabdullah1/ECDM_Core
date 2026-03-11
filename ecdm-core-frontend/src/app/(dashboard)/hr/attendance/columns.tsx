import { Clock } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface AttendanceRecord {
    _id: string;
    employeeId: string;
    userId?: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
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
        render: (row: AttendanceRecord) => (
            <span className="font-mono text-sm">{row.employeeId}</span>
        ),
    },
    {
        key: 'name',
        header: 'Name',
        render: (row: AttendanceRecord) => (
            <div>
                <span className="font-medium">{row.name}</span>
                {row.userId && (
                    <span className="ml-2 text-xs text-[hsl(var(--primary))]">● Linked</span>
                )}
            </div>
        ),
    },
    {
        key: 'department',
        header: 'Department',
        render: (row: AttendanceRecord) => row.department || '—',
    },
    {
        key: 'date',
        header: 'Date',
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
        render: (row: AttendanceRecord) => row.day || '—',
    },
    {
        key: 'checkIn',
        header: 'Check In',
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
        render: (row: AttendanceRecord) => <StatusBadge status={row.status} />,
    },
    {
        key: 'notes',
        header: 'Notes',
        render: (row: AttendanceRecord) => (
            <div className="max-w-[120px] truncate text-gray-500" title={row.notes}>
                {row.notes || '—'}
            </div>
        ),
    },
];
