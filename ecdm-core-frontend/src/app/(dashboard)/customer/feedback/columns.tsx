'use client';

import { Edit, Trash2 } from 'lucide-react';

/**
 * Feedback Data Table - Column Definitions
 * 
 * Merges inherited operational data from Customer Orders with new customer rating fields
 * 13 Total Columns + Actions as per requirements
 */

// ─────────────────────────────────────────────────────────────────────────────
// Date Formatting Helpers
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
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  address?: string;
  region?: string;
}

interface CustomerOrder {
  _id: string;
  engineerName?: string;
  actualVisitDate?: string;
  startDate?: string;
  endDate?: string;
}

interface User {
  _id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface OrderContext {
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  engineerName?: string;
  visitDate?: string;
  scheduledVisitDate?: string;
  actualVisitDate?: string;
  startDate?: string;
  endDate?: string;
  dealStatus?: string;
  orderId?: string;
}

export interface Feedback {
  _id: string;
  
  // Populated references
  customerId?: Customer;
  customerOrderId?: CustomerOrder;
  updatedBy?: User;
  
  // Order Context - Single Source of Truth
  orderContext?: OrderContext;
  
  // Feedback specific fields
  solvedIssue?: string; // 'Yes' | 'No' | ''
  ratingOperation?: string;
  followUp?: string; // 'Yes' | 'No' | ''
  ratingCustomerService?: string;
  notes?: string;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge Component for Status Display
// ─────────────────────────────────────────────────────────────────────────────

const Badge = ({ children, variant = 'outline' }: { children: React.ReactNode; variant?: 'default' | 'destructive' | 'outline' }) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
  
  const variantClasses: Record<string, string> = {
    'default':     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'destructive': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'outline':     'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]}`;
  
  return <span className={classes}>{children || '-'}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Column Definitions (13 Columns + Actions)
// ─────────────────────────────────────────────────────────────────────────────

export const columns: Array<{
  key: string;
  header: string;
  render: (row: Feedback, meta?: any) => React.ReactNode;
}> = [
    
    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 1: Customer Info (SSOT from Customer Population) - 3 Columns
    // ═════════════════════════════════════════════════════════════════════════
    
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Customer ID
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customerId',
      header: 'Customer ID',
      render: (row: Feedback) => {
        const custId = row.orderContext?.customerId || row.customerId?.customerId;
        return (
          <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            {custId || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Name
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.name',
      header: 'Name',
      render: (row: Feedback) => {
        const name = row.orderContext?.customerName || row.customerId?.name;
        return (
          <span className="font-medium">
            {name || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Phone
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.phone',
      header: 'Phone',
      render: (row: Feedback) => {
        const phone = row.orderContext?.customerPhone || row.customerId?.phone;
        return (
          <span className="font-mono text-sm">
            {phone || '-'}
          </span>
        );
      },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 2: Inherited Operational Data (From CustomerOrder) - 4 Columns
    // ═════════════════════════════════════════════════════════════════════════
    
    // ─────────────────────────────────────────────────────────────────────────
    // 4. Engineer Name
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'engineerName',
      header: 'Engineer Name',
      render: (row: Feedback) => {
        const engineerName = row.orderContext?.engineerName || row.customerOrderId?.engineerName;
        return (
          <span className="font-medium">
            {engineerName || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Visit Engineer Date
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'visitDate',
      header: 'Visit Engineer Date',
      render: (row: Feedback) => {
        const visitDate = row.orderContext?.actualVisitDate || row.orderContext?.visitDate || row.customerOrderId?.actualVisitDate;
        return (
          <span className="text-sm">
            {formatDate(visitDate)}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Start Date
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'startDate',
      header: 'Start Date',
      render: (row: Feedback) => {
        const startDate = row.orderContext?.startDate || row.customerOrderId?.startDate;
        return (
          <span className="text-sm">
            {formatDate(startDate)}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 7. End Date
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'endDate',
      header: 'End Date',
      render: (row: Feedback) => {
        const endDate = row.orderContext?.endDate || row.customerOrderId?.endDate;
        return (
          <span className="text-sm">
            {formatDate(endDate)}
          </span>
        );
      },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 3: Feedback & Ratings (Editable in Feedback module) - 4 Columns
    // ═════════════════════════════════════════════════════════════════════════
    
    // ─────────────────────────────────────────────────────────────────────────
    // 8. Solved Issue
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'solvedIssue',
      header: 'Solved Issue',
      render: (row: Feedback) => {
        const solved = row.solvedIssue;
        if (!solved || solved === '') return <span>-</span>;
        
        const variant = solved === 'Yes' ? 'default' : 'destructive';
        return <Badge variant={variant}>{solved}</Badge>;
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Rating Operation (Tech/Eng)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'ratingOperation',
      header: 'Rating Operation (Tech/Eng)',
      render: (row: Feedback) => {
        const rating = row.ratingOperation;
        return (
          <span className="text-sm font-medium">
            {rating || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Follow Up
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'followUp',
      header: 'Follow Up',
      render: (row: Feedback) => {
        const followUp = row.followUp;
        if (!followUp || followUp === '') return <span>-</span>;
        
        const variant = followUp === 'Yes' ? 'destructive' : 'default';
        return <Badge variant={variant}>{followUp}</Badge>;
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Rating Customer Service
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'ratingCustomerService',
      header: 'Rating Customer Service',
      render: (row: Feedback) => {
        const rating = row.ratingCustomerService;
        return (
          <span className="text-sm font-medium">
            {rating || '-'}
          </span>
        );
      },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 4: Meta (User Email & Notes) - 2 Columns
    // ═════════════════════════════════════════════════════════════════════════
    
    // ─────────────────────────────────────────────────────────────────────────
    // 12. User Email
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'userEmail',
      header: 'User Email',
      render: (row: Feedback) => {
        const email = row.updatedBy?.email;
        return (
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {email || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 13. Notes
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'notes',
      header: 'Notes',
      render: (row: Feedback) => {
        const notes = row.notes;
        return (
          <span 
            className="text-sm truncate max-w-[150px] inline-block" 
            title={notes}
          >
            {notes || '-'}
          </span>
        );
      },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 5: Actions Column
    // ═════════════════════════════════════════════════════════════════════════
    
    // ─────────────────────────────────────────────────────────────────────────
    // Actions (Edit/Delete)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Feedback, meta?: any) => {
        return (
          <div className="flex items-center gap-2">
            {/* Edit Button */}
            {meta?.onEdit && (
              <button
                onClick={() => meta.onEdit(row)}
                className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-[hsl(var(--foreground))]"
                title="Edit Feedback"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            
            {/* Delete Button */}
            {meta?.onDelete && (
              <button
                onClick={() => meta.onDelete(row._id)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-red-600 dark:text-red-400"
                title="Delete Feedback"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
];
