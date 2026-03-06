'use client';

import { Edit, Trash2 } from 'lucide-react';

/**
 * Work Orders Data Table - Column Definitions
 * 
 * 28 Columns + Actions for the Maintenance/Workshop Module
 * Displays deep populated data from CustomerOrder → Customer chain
 * All date fields formatted appropriately
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

const differenceInDays = (start: Date, end: Date): number => {
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces (Deep Populated Work Order)
// ─────────────────────────────────────────────────────────────────────────────

interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  address?: string;
  region?: string;
  sector?: string;
}

interface CustomerOrder {
  _id: string;
  customerId?: Customer;
  typeOfOrder?: string;
  issue?: string;
  scheduledVisitDate?: string;
  engineerName?: string;
  actualVisitDate?: string;
  devicePickupType?: string;
  startDate?: string;
  endDate?: string;
  deviceReturnedDate?: string;
}

interface User {
  _id: string;
  name?: string;
  email?: string;
}

export interface WorkOrder {
  _id: string;
  
  // Populated reference (deep: CustomerOrder → Customer)
  customerOrderId?: CustomerOrder;
  
  // Workshop / Maintenance Specific Fields
  taskDate?: string;
  maintenanceEngineer?: string;
  startMaintenanceDate?: string;
  endMaintenanceDate?: string;
  punctuality?: string;
  reasonForDelay?: string;
  taskCompleted?: string;
  reasonForIncompletion?: string;
  rating?: string;
  sparePartsId?: string;
  sparePartsAvailability?: string;
  notes?: string;
  
  // Tracking
  updatedBy?: User;
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge Component for Status Display
// ─────────────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'success' | 'warning';
}

const Badge = ({ children, variant = 'outline' }: BadgeProps) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
  
  const variantClasses: Record<string, string> = {
    'default':     'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'destructive': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'success':     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'warning':     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'outline':     'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  };
  
  return <span className={`${baseClasses} ${variantClasses[variant]}`}>{children || '-'}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Column Definitions (28 Columns + Actions)
// ─────────────────────────────────────────────────────────────────────────────

export const columns: Array<{
  key: string;
  header: string;
  render: (row: WorkOrder, meta?: any) => React.ReactNode;
}> = [
    
    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 1: Customer Info (Deep Inherited from CustomerOrder → Customer) - 6 Columns
    // ═════════════════════════════════════════════════════════════════════════
    
    // 1. Customer ID
    {
      key: 'customerId',
      header: 'Customer ID',
      render: (row: WorkOrder) => {
        const custId = row.customerOrderId?.customerId?.customerId;
        return (
          <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            {custId || '-'}
          </span>
        );
      },
    },

    // 2. Name
    {
      key: 'name',
      header: 'Name',
      render: (row: WorkOrder) => {
        const name = row.customerOrderId?.customerId?.name;
        return (
          <span className="font-medium">
            {name || '-'}
          </span>
        );
      },
    },

    // 3. Phone
    {
      key: 'phone',
      header: 'Phone',
      render: (row: WorkOrder) => {
        const phone = row.customerOrderId?.customerId?.phone;
        return (
          <span className="font-mono text-sm">
            {phone || '-'}
          </span>
        );
      },
    },

    // 4. Address
    {
      key: 'address',
      header: 'Address',
      render: (row: WorkOrder) => {
        const address = row.customerOrderId?.customerId?.address;
        return (
          <span className="truncate max-w-[100px] inline-block text-sm" title={address || ''}>
            {address || '-'}
          </span>
        );
      },
    },

    // 5. Region
    {
      key: 'region',
      header: 'Region',
      render: (row: WorkOrder) => {
        const region = row.customerOrderId?.customerId?.region;
        return (
          <span className="text-sm">
            {region || '-'}
          </span>
        );
      },
    },

    // 6. Sector
    {
      key: 'sector',
      header: 'Sector',
      render: (row: WorkOrder) => {
        const sector = row.customerOrderId?.customerId?.sector;
        return (
          <span className="text-sm">
            {sector || '-'}
          </span>
        );
      },
    },
    
    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 2: Order & Ops Info (Inherited from CustomerOrder) - 7 Columns
    // ═════════════════════════════════════════════════════════════════════════
    
    // 7. Type Of Order
    {
      key: 'typeOfOrder',
      header: 'Type Of Order',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm">
            {row.customerOrderId?.typeOfOrder || '-'}
          </span>
        );
      },
    },

    // 8. Issue
    {
      key: 'issue',
      header: 'Issue',
      render: (row: WorkOrder) => {
        const issue = row.customerOrderId?.issue || '-';
        return (
          <span className="truncate max-w-[150px] inline-block text-sm" title={issue}>
            {issue}
          </span>
        );
      },
    },

    // 9. Visit Site (Scheduled)
    {
      key: 'visitSite',
      header: 'Visit Site (Scheduled)',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm font-mono">
            {formatDateTime(row.customerOrderId?.scheduledVisitDate)}
          </span>
        );
      },
    },

    // 10. Engineer Name (Ops)
    {
      key: 'engineerName',
      header: 'Engineer Name (Ops)',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm">
            {row.customerOrderId?.engineerName || '-'}
          </span>
        );
      },
    },

    // 11. Visit Date (Actual)
    {
      key: 'actualVisitDate',
      header: 'Visit Date (Actual)',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm font-mono">
            {formatDateTime(row.customerOrderId?.actualVisitDate)}
          </span>
        );
      },
    },

    // 12. Device Pickup Type
    {
      key: 'devicePickupType',
      header: 'Device Pickup Type',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm">
            {row.customerOrderId?.devicePickupType || '-'}
          </span>
        );
      },
    },

    // 13. Start Date (Order)
    {
      key: 'startDateOrder',
      header: 'Start Date (Order)',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm font-mono">
            {formatDate(row.customerOrderId?.startDate)}
          </span>
        );
      },
    },
    
    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 3: Workshop / Maintenance Data (Editable in Work Orders) - 10 Columns
    // ═════════════════════════════════════════════════════════════════════════
    
    // 14. Task Date (Op Role)
    {
      key: 'taskDate',
      header: 'Task Date (Op Role)',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm font-mono">
            {formatDate(row.taskDate)}
          </span>
        );
      },
    },

    // 15. Maintenance Engineer
    {
      key: 'maintenanceEngineer',
      header: 'Maintenance Engineer',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm">
            {row.maintenanceEngineer || '-'}
          </span>
        );
      },
    },

    // 16. Start Maint. Date
    {
      key: 'startMaintenanceDate',
      header: 'Start Maint. Date',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm font-mono">
            {formatDate(row.startMaintenanceDate)}
          </span>
        );
      },
    },

    // 17. End Maint. Date
    {
      key: 'endMaintenanceDate',
      header: 'End Maint. Date',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm font-mono">
            {formatDate(row.endMaintenanceDate)}
          </span>
        );
      },
    },

    // 18. Punctuality
    {
      key: 'punctuality',
      header: 'Punctuality',
      render: (row: WorkOrder) => {
        const value = row.punctuality;
        if (!value || value === '') return <span className="text-sm">-</span>;
        const variant = value === 'Same time' ? 'success' : 'warning';
        return <Badge variant={variant}>{value}</Badge>;
      },
    },

    // 19. Late (Days) - Calculated
    {
      key: 'late',
      header: 'Late (Days)',
      render: (row: WorkOrder) => {
        const start = row.startMaintenanceDate;
        const end = row.endMaintenanceDate;
        if (start && end) {
          const days = differenceInDays(new Date(start), new Date(end));
          return <span className="text-sm font-mono">{days} Days</span>;
        }
        return <span className="text-sm">-</span>;
      },
    },

    // 20. Reason for Delay
    {
      key: 'reasonForDelay',
      header: 'Reason for Delay',
      render: (row: WorkOrder) => {
        const reason = row.reasonForDelay || '-';
        return (
          <span className="truncate max-w-[120px] inline-block text-sm" title={reason}>
            {reason}
          </span>
        );
      },
    },

    // 21. Task Completed
    {
      key: 'taskCompleted',
      header: 'Task Completed',
      render: (row: WorkOrder) => {
        const value = row.taskCompleted;
        if (!value || value === '') return <span className="text-sm">-</span>;
        const variant = value === 'Yes' ? 'default' : 'destructive';
        return <Badge variant={variant}>{value}</Badge>;
      },
    },

    // 22. Reason (If No)
    {
      key: 'reasonForIncompletion',
      header: 'Reason (If No)',
      render: (row: WorkOrder) => {
        const reason = row.reasonForIncompletion || '-';
        return (
          <span className="truncate max-w-[120px] inline-block text-sm" title={reason}>
            {reason}
          </span>
        );
      },
    },

    // 23. Rating
    {
      key: 'rating',
      header: 'Rating',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm">
            {row.rating || '-'}
          </span>
        );
      },
    },
    
    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 4: Order Closing Info (Inherited from CustomerOrder) - 2 Columns
    // ═════════════════════════════════════════════════════════════════════════
    
    // 24. End Date (Order)
    {
      key: 'endDateOrder',
      header: 'End Date (Order)',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm font-mono">
            {formatDate(row.customerOrderId?.endDate)}
          </span>
        );
      },
    },

    // 25. Device Returned (Order)
    {
      key: 'deviceReturned',
      header: 'Device Returned (Order)',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm font-mono">
            {formatDate(row.customerOrderId?.deviceReturnedDate)}
          </span>
        );
      },
    },
    
    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 5: Parts & Notes - 3 Columns
    // ═════════════════════════════════════════════════════════════════════════
    
    // 26. Spare Parts ID
    {
      key: 'sparePartsId',
      header: 'Spare Parts ID',
      render: (row: WorkOrder) => {
        return (
          <span className="text-sm font-mono">
            {row.sparePartsId || '-'}
          </span>
        );
      },
    },

    // 27. Availability
    {
      key: 'sparePartsAvailability',
      header: 'Availability',
      render: (row: WorkOrder) => {
        const value = row.sparePartsAvailability;
        if (!value || value === '') return <span className="text-sm">-</span>;
        
        let variant: BadgeProps['variant'] = 'outline';
        if (value === 'Available') variant = 'success';
        else if (value === 'Not Available') variant = 'destructive';
        else if (value === 'Requested') variant = 'warning';
        
        return <Badge variant={variant}>{value}</Badge>;
      },
    },

    // 28. Notes
    {
      key: 'notes',
      header: 'Notes',
      render: (row: WorkOrder) => {
        const notes = row.notes || '-';
        return (
          <span className="truncate max-w-[150px] inline-block text-sm" title={notes}>
            {notes}
          </span>
        );
      },
    },
    
    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 6: Actions - Edit & Delete
    // ═════════════════════════════════════════════════════════════════════════
    
    {
      key: 'actions',
      header: 'Actions',
      render: (row: WorkOrder, meta?: any) => {
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => meta?.onEdit?.(row)}
              className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors"
              title="Edit Work Order"
            >
              <Edit className="h-4 w-4 text-blue-500" />
            </button>
            <button
              onClick={() => meta?.onDelete?.(row._id)}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete Work Order"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        );
      },
    },
];
