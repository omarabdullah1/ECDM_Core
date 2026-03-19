'use client';

import { Phone, CheckCircle, Edit2, Trash2 } from 'lucide-react';

/**
 * Follow-Up QC Pipeline - Column Definitions
 * 
 * 19 Total Columns + Actions for Quality Control pipeline
 * Blends inherited data from Customer Orders and new QC fields
 */

// ─────────────────────────────────────────────────────────────────────────────
// Date Formatting Helper
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return '-';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Late Days Difference Calculator
// ─────────────────────────────────────────────────────────────────────────────

const calculateLateDays = (startDate?: string, endDate?: string): string => {
  if (!startDate || !endDate) return '-';
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} Days`;
  } catch {
    return '-';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface Customer {
  _id?: string;
  customerId?: string;
  name?: string;
  phone?: string;
  address?: string;
  region?: string;
}

interface CustomerOrder {
  _id?: string;
  issue?: string;
  scheduledVisitDate?: string;
  engineerName?: string;
  actualVisitDate?: string;
  deal?: string;
  startDate?: string;
  endDate?: string;
  deviceReturnedDate?: string;
}

interface SalesData {
  issue?: string;
  customer?: Customer;
}

interface SalesLead {
  issue?: string;
  customerId?: Customer;
}

interface User {
  _id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface FollowUp {
  _id: string;
  status: 'Pending' | 'Contacted' | 'Scheduled' | 'Completed' | 'Canceled';
  
  // Source references
  customer?: Customer & { _id: string };
  customerOrderId?: CustomerOrder & { _id: string };
  salesDataId?: SalesData;
  leadId?: SalesLead;
  workOrder?: { _id: string; typeOfOrder?: string; issue?: string };
  csr?: { _id: string; firstName?: string; lastName?: string };
  
  // QC Fields
  punctuality?: string;        // 'Same Visit Time' | 'Late' | ''
  reasonForDelay?: string;
  solvedIssue?: string;        // 'Yes' | 'No' | ''
  
  // Follow-up fields
  followUp?: string;           // 'Yes' | 'No' | ''
  followUpDate?: string;
  notes?: string;
  
  // Audit
  updatedBy?: User;
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge Component
// ─────────────────────────────────────────────────────────────────────────────

const Badge = ({ children, variant = 'outline' }: { children: React.ReactNode; variant?: string }) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  
  const variantClasses: Record<string, string> = {
    'Pending':   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Approved':  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Done':      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Rejected':  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'outline':   'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  };
  
  const statusVariant = typeof children === 'string' ? children : 'outline';
  const classes = `${baseClasses} ${variantClasses[statusVariant] || variantClasses['outline']}`;
  
  return <span className={classes}>{children || '-'}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Column Interface
// ─────────────────────────────────────────────────────────────────────────────

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Column Definitions (19 Columns + Actions)
// ─────────────────────────────────────────────────────────────────────────────

export const createColumns = (
  onStatusUpdate: (id: string, status: string) => Promise<void>,
  onEdit: (row: FollowUp) => void,
  onDelete: (id: string) => void
): Column<FollowUp>[] => [
  
  // 1. Customer ID
  {
    key: 'customerId',
    header: 'Customer ID',
    render: (row) => (
      <span className="font-mono text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
        {row.customer?.customerId || '-'}
      </span>
    ),
  },
  
  // 2. Name
  {
    key: 'name',
    header: 'Name',
    render: (row) => (
      <span className="font-medium whitespace-nowrap">
        {row.customer?.name || '-'}
      </span>
    ),
  },
  
  // 3. Phone
  {
    key: 'phone',
    header: 'Phone',
    render: (row) => (
      <span className="font-mono text-sm whitespace-nowrap">
        {row.customer?.phone || '-'}
      </span>
    ),
  },
  
  // 4. Issue
  {
    key: 'issue',
    header: 'Issue',
    render: (row) => {
      const issue = row.customerOrderId?.issue || row.salesDataId?.issue || row.leadId?.issue || '';
      return (
        <span className="text-sm max-w-[150px] truncate block" title={issue}>
          {issue || '-'}
        </span>
      );
    },
  },
  
  // 5. Visit Site (Scheduled Visit Date)
  {
    key: 'visitSite',
    header: 'Visit Site',
    render: (row) => (
      <span className="text-sm whitespace-nowrap">
        {formatDate(row.customerOrderId?.scheduledVisitDate)}
      </span>
    ),
  },
  
  // 6. Engineer Name
  {
    key: 'engineerName',
    header: 'Engineer Name',
    render: (row) => (
      <span className="font-medium whitespace-nowrap">
        {row.customerOrderId?.engineerName || '-'}
      </span>
    ),
  },
  
  // 7. Visit Date (Actual)
  {
    key: 'visitDate',
    header: 'Visit Date',
    render: (row) => (
      <span className="text-sm whitespace-nowrap">
        {formatDate(row.customerOrderId?.actualVisitDate)}
      </span>
    ),
  },
  
  // 8. Deal
  {
    key: 'deal',
    header: 'Deal',
    render: (row) => {
      const deal = row.customerOrderId?.deal;
      return deal ? <Badge>{deal}</Badge> : <span>-</span>;
    },
  },
  
  // 9. Start Date
  {
    key: 'startDate',
    header: 'Start Date',
    render: (row) => (
      <span className="text-sm whitespace-nowrap">
        {formatDate(row.customerOrderId?.startDate)}
      </span>
    ),
  },
  
  // 10. End Date
  {
    key: 'endDate',
    header: 'End Date',
    render: (row) => (
      <span className="text-sm whitespace-nowrap">
        {formatDate(row.customerOrderId?.endDate)}
      </span>
    ),
  },
  
  // 11. Device Returned Date
  {
    key: 'deviceReturnedDate',
    header: 'Device Returned',
    render: (row) => (
      <span className="text-sm whitespace-nowrap">
        {formatDate(row.customerOrderId?.deviceReturnedDate)}
      </span>
    ),
  },
  
  // 12. Punctuality
  {
    key: 'punctuality',
    header: 'Punctuality',
    render: (row) => (
      <span className="text-sm whitespace-nowrap">
        {row.punctuality || '-'}
      </span>
    ),
  },
  
  // 13. Late (Days Difference)
  {
    key: 'lateDifference',
    header: 'Late (Days)',
    render: (row) => (
      <span className="text-sm whitespace-nowrap">
        {calculateLateDays(row.customerOrderId?.startDate, row.customerOrderId?.endDate)}
      </span>
    ),
  },
  
  // 14. Reason for Delay
  {
    key: 'reasonForDelay',
    header: 'Reason for Delay',
    render: (row) => (
      <span className="text-sm max-w-[120px] truncate block" title={row.reasonForDelay}>
        {row.reasonForDelay || '-'}
      </span>
    ),
  },
  
  // 15. Solved Issue?
  {
    key: 'solvedIssue',
    header: 'Solved Issue?',
    render: (row) => (
      <span className="text-sm whitespace-nowrap">
        {row.solvedIssue || '-'}
      </span>
    ),
  },
  
  // 16. Follow Up (Needs another?)
  {
    key: 'followUp',
    header: 'Follow Up',
    render: (row) => (
      <span className="text-sm whitespace-nowrap">
        {row.followUp || '-'}
      </span>
    ),
  },
  
  // 17. Follow-Up Date
  {
    key: 'followUpDate',
    header: 'Follow up Date',
    render: (row) => (
      <span className="text-sm whitespace-nowrap">
        {formatDate(row.followUpDate)}
      </span>
    ),
  },
  
  // 18. User Email
  {
    key: 'userEmail',
    header: 'User Email',
    render: (row) => (
      <span className="text-sm text-[hsl(var(--muted-foreground))] whitespace-nowrap">
        {row.updatedBy?.email || '-'}
      </span>
    ),
  },
  
  // 19. Notes
  {
    key: 'notes',
    header: 'Notes',
    render: (row) => (
      <span className="text-sm max-w-[120px] truncate block" title={row.notes}>
        {row.notes || '-'}
      </span>
    ),
  },
  
  // Actions
  {
    key: 'actions',
    header: 'Actions',
    render: (row) => {
      const status = row.status;
      const id = row._id;

      return (
        <div className="flex items-center gap-2">
          {status === 'Pending' && (
            <button
              onClick={() => onStatusUpdate(id, 'Contacted')}
              className="p-1 hover:bg-blue-50 rounded text-blue-600 transition-colors"
              title="Mark as Contacted"
            >
              <Phone className="h-4 w-4" />
            </button>
          )}

          {(status === 'Pending' || status === 'Contacted' || status === 'Scheduled') && (
            <button
              onClick={() => onStatusUpdate(id, 'Completed')}
              className="p-1 hover:bg-green-50 rounded text-green-600 transition-colors"
              title="Mark as Completed"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => onEdit(row)}
            className="p-1 hover:bg-[hsl(var(--muted))] rounded text-[hsl(var(--foreground))] transition-colors"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>

          <button
            onClick={() => onDelete(id)}
            className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    },
  },
];

