'use client';

import { Edit, Trash2 } from 'lucide-react';

/**
 * Customer Orders Data Table - Column Definitions
 * 
 * Implements SSOT pattern for Customer data
 * 19 Total Columns + Actions as per requirements
 * All date fields formatted as DateTime (dd/MM/yyyy HH:mm)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Date Formatting Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatDateTime = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return '-';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
};

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
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  address?: string;
  region?: string;
  sector?: string;
  email?: string;
  company?: string;
}

interface SalesOrder {
  _id: string;
  salesOrderId?: string;
  issueDescription?: string;
  quotationStatus?: string;
  finalStatus?: string;
}

interface User {
  _id: string;
  name?: string;
  email?: string;
}

export interface CustomerOrder {
  _id: string;

  // Populated references (SSOT)
  customerId?: Customer;
  salesOrderId?: SalesOrder;
  updatedBy?: User;

  // Inherited fields
  typeOfOrder?: string;
  issue?: string;
  scheduledVisitDate?: string;

  // Operational fields
  engineerName?: string;
  actualVisitDate?: string;
  devicePickupType?: string;
  deal?: string;
  cost?: number;
  startDate?: string;
  endDate?: string;
  deviceReturnedDate?: string;
  notes?: string;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge Component for Deal Status
// ─────────────────────────────────────────────────────────────────────────────

const Badge = ({ children, variant = 'outline' }: { children: React.ReactNode; variant?: string }) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";

  const variantClasses: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Approved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'Done': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'outline': 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  };

  const statusVariant = typeof children === 'string' ? children : 'outline';
  const classes = `${baseClasses} ${variantClasses[statusVariant] || variantClasses['outline']}`;

  return <span className={classes}>{children || '-'}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Column Definitions (19 Columns + Actions)
// ─────────────────────────────────────────────────────────────────────────────

export const columns: Array<{
  key: string;
  header: string;
  render: (row: CustomerOrder, meta?: any) => React.ReactNode;
}> = [

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 1: Customer Info (SSOT from Customer Population) - 6 Columns
    // ═════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Customer ID (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customerId',
      header: 'Customer ID',
      render: (row: CustomerOrder) => {
        const custId = row.customerId?.customerId;
        return (
          <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            {custId || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Name (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.name',
      header: 'Name',
      render: (row: CustomerOrder) => {
        const name = row.customerId?.name;
        return (
          <span className="font-medium">
            {name || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Phone (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.phone',
      header: 'Phone',
      render: (row: CustomerOrder) => {
        const phone = row.customerId?.phone;
        return (
          <span className="font-mono text-sm">
            {phone || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Address (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.address',
      header: 'Address',
      render: (row: CustomerOrder) => {
        const address = row.customerId?.address;
        return (
          <span className="text-sm max-w-[200px] truncate block" title={address}>
            {address || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Region (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.region',
      header: 'Region',
      render: (row: CustomerOrder) => {
        const region = row.customerId?.region;
        return (
          <span className="text-sm">
            {region || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Sector (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.sector',
      header: 'Sector',
      render: (row: CustomerOrder) => {
        const sector = row.customerId?.sector;
        return (
          <span className="text-sm">
            {sector || '-'}
          </span>
        );
      },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 2: Inherited Order Details - 3 Columns
    // ═════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Type Of Order
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'typeOfOrder',
      header: 'Type Of Order',
      render: (row: CustomerOrder) => {
        return (
          <span className="text-sm">
            {row.typeOfOrder || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Issue
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'issue',
      header: 'Issue',
      render: (row: CustomerOrder) => {
        const issue = row.issue || '-';
        return (
          <span className="truncate max-w-[150px] inline-block text-sm" title={issue}>
            {issue}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Visit Site Date (Scheduled) - Inherited from siteInspectionDate
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'scheduledVisitDate',
      header: 'Visit Site Date',
      render: (row: CustomerOrder) => {
        return <span className="text-sm font-mono">{formatDateTime(row.scheduledVisitDate)}</span>;
      },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 3: Operational Data - 8 Columns
    // ═════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Engineer Name
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'engineerName',
      header: 'Engineer Name',
      render: (row: CustomerOrder) => {
        return (
          <span className="text-sm">
            {row.engineerName || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Actual Visit Date
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'actualVisitDate',
      header: 'Visit Date (Actual)',
      render: (row: CustomerOrder) => {
        return <span className="text-sm font-mono">{formatDateTime(row.actualVisitDate)}</span>;
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 12. Device Pickup Type
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'devicePickupType',
      header: 'Device Pickup Type',
      render: (row: CustomerOrder) => {
        return (
          <span className="text-sm">
            {row.devicePickupType || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 13. Deal Status
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'deal',
      header: 'Deal',
      render: (row: CustomerOrder) => {
        return <Badge variant="outline">{row.deal || 'Pending'}</Badge>;
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 14. Cost
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'cost',
      header: 'Cost',
      render: (row: CustomerOrder) => {
        return (
          <span className="text-sm font-mono">
            {row.cost && row.cost > 0 ? `$${row.cost.toFixed(2)}` : '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 15. Start Date
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'startDate',
      header: 'Start Date',
      render: (row: CustomerOrder) => {
        return <span className="text-sm font-mono">{formatDate(row.startDate)}</span>;
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 16. End Date
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'endDate',
      header: 'End Date',
      render: (row: CustomerOrder) => {
        return <span className="text-sm font-mono">{formatDate(row.endDate)}</span>;
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 17. Device Returned Date
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'deviceReturnedDate',
      header: 'Device Returned Date',
      render: (row: CustomerOrder) => {
        return <span className="text-sm font-mono">{formatDate(row.deviceReturnedDate)}</span>;
      },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 4: Audit & Notes - 2 Columns
    // ═════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // 18. Last Updated By
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'updatedBy',
      header: 'User ID (Updater)',
      render: (row: CustomerOrder) => {
        const updater = row.updatedBy?.name || row.updatedBy?.email || '-';
        return (
          <span className="text-sm">
            {updater}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 19. Notes
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'notes',
      header: 'Notes',
      render: (row: CustomerOrder) => {
        const notes = row.notes || '-';
        return (
          <span className="truncate max-w-[150px] inline-block text-sm" title={notes}>
            {notes}
          </span>
        );
      },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 5: Actions - Edit & Delete
    // ═════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // 20. Actions
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'actions',
      header: 'Actions',
      render: (row: CustomerOrder, meta?: any) => {
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => meta?.onEdit?.(row)}
              className="p-1 hover:bg-blue-500/10 rounded transition-colors"
              title="Edit Order"
            >
              <Edit className="h-3.5 w-3.5 text-blue-500" />
            </button>
            <button
              onClick={() => meta?.onDelete?.(row._id)}
              className="p-1 hover:bg-red-500/10 rounded transition-colors"
              title="Delete Order"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        );
      },
    },

  ];
