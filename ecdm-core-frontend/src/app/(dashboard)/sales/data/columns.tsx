'use client';
import { Edit2, Trash2, History, Eye } from 'lucide-react';

/**
 * Sales Data (Data Leads) Table - Column Definitions
 * 
 * Implements SSOT pattern for Customer data
 * All date fields formatted as DateTime (dd/MM/yyyy HH:mm)
 * 
 * Note: Backend MUST use .populate('customer') in the GET controller
 */

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
}

interface SalesPerson {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface MarketingData {
  _id: string;
  name?: string;
  phone?: string;
  dataSource?: string;
  uploadBatch?: string;
}

export interface SalesData {
  _id: string;
  
  // Populated Customer (SSOT)
  customer?: Customer;
  customerId?: Customer; // Alternative population field name
  
  // Populated MarketingData
  marketingData?: MarketingData;
  
  // Populated SalesPerson
  salesPerson?: SalesPerson;
  
  // Core Sales Data fields
  callDate?: string | Date;
  callOutcome?: string; // Status: Pending, NoAnswer, Interested, Converted, Rejected
  typeOfOrder?: string;
  salesPlatform?: string;
  issue?: string;       // Issue/Problem description
  order?: 'Yes' | 'No' | '';        // Restricted to Yes/No
  followUp?: 'Yes' | 'No' | '';     // Restricted to Yes/No
  followUpDate?: string | Date;
  notes?: string;
  
  // Lock state flags (appended by backend)
  isFollowUpLocked?: boolean;  // True if downstream FollowUp has progressed beyond Pending
  isOrderLocked?: boolean;      // True if downstream Order has quotation or status changed
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DateTime Formatting Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format date as DateTime: dd/MM/yyyy HH:mm
 * @param dateValue - ISO date string or Date object
 * @returns Formatted date string or "-"
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge Component
// ─────────────────────────────────────────────────────────────────────────────

const getStatusColor = (status: string | undefined): string => {
  if (!status) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  
  const normalizedStatus = status.toLowerCase();
  
  if (normalizedStatus.includes('interested')) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
  }
  if (normalizedStatus.includes('converted')) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
  }
  if (normalizedStatus.includes('rejected') || normalizedStatus.includes('no answer')) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
  }
  if (normalizedStatus.includes('pending')) {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
  }
  
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
};

// ─────────────────────────────────────────────────────────────────────────────
// Column Definitions (17 Columns - As Required)
// ─────────────────────────────────────────────────────────────────────────────

interface SalesDataColumnsConfig {
  onEdit?: (row: SalesData) => void;
  onDelete?: (row: SalesData) => void;
  onHistory?: (row: SalesData) => void;
  currentUser?: {
    _id: string;
    role: string;
  } | null;
}

export const createSalesDataColumns = (config?: SalesDataColumnsConfig) => {
  const { onEdit, onDelete, onHistory } = config || {};

  return [
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Checkbox Column (Bulk Delete/Selection)
    // Note: This is handled automatically by DataTable component
    // No need to define explicitly - it's added when bulkDeleteEndpoint is provided
    // ─────────────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CustomerID (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.customerId',
      header: 'Customer ID',
      className: 'md:w-[1%] md:whitespace-nowrap',
      render: (row: SalesData) => {
        const customer = row.customer || row.customerId;
        const custId = customer?.customerId;
        return (
          <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            {custId || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Name (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.name',
      header: 'Name',
      className: 'md:w-auto md:max-w-[150px] md:truncate',
      render: (row: SalesData) => {
        const customer = row.customer || row.customerId;
        const name = customer?.name;
        return (
          <span className="font-medium">
            {name || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Phone (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.phone',
      header: 'Phone',
      className: 'hidden xl:table-cell md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => {
        const customer = row.customer || row.customerId;
        const phone = customer?.phone;
        return (
          <span className="font-mono text-sm">
            {phone || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Address (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.address',
      header: 'Address',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => {
        const customer = row.customer || row.customerId;
        const address = customer?.address;
        return (
          <span className="text-sm max-w-[200px] truncate block" title={address}>
            {address || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Region (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.region',
      header: 'Region',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => {
        const customer = row.customer || row.customerId;
        const region = customer?.region;
        return (
          <span className="text-sm">
            {region || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Date (DateTime: dd/MM/yyyy HH:mm)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'callDate',
      header: 'Date',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => (
        <span className="text-xs font-mono whitespace-nowrap">
          {formatDateTime(row.callDate)}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Sector (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.sector',
      header: 'Sector',
      className: 'hidden xl:table-cell md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => {
        const customer = row.customer || row.customerId;
        const sector = customer?.sector;
        return (
          <span className="text-sm">
            {sector || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Issue (Problem Description)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'issue',
      header: 'Issue',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => (
        <span className="text-sm max-w-[150px] truncate block" title={row.issue}>
          {row.issue || '-'}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Status (callOutcome)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'callOutcome',
      header: 'Status',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => {
        const status = row.callOutcome || 'Pending';
        return (
          <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${getStatusColor(status)}`}>
            {status}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Type Of Order
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'typeOfOrder',
      header: 'Type Of Order',
      className: 'hidden xl:table-cell md:w-[1%] md:whitespace-nowrap',
      render: (row: SalesData) => (
        <span className="text-sm">
          {row.typeOfOrder || '-'}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 12. Sales Platform
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'salesPlatform',
      header: 'Sales Platform',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => (
        <span className="text-sm">
          {row.salesPlatform || '-'}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 13. Order (Yes/No)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'order',
      header: 'Order',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => {
        if (!row.order) return <span className="text-gray-400 text-xs">-</span>;
        
        const isYes = row.order === 'Yes';
        return (
          <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
            isYes 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {row.order}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 14. Follow Up (Yes/No)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'followUp',
      header: 'Follow Up',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => {
        if (!row.followUp) return <span className="text-gray-400 text-xs">-</span>;
        
        const isYes = row.followUp === 'Yes';
        return (
          <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
            isYes 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {row.followUp}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 15. Follow Up Date (DateTime: dd/MM/yyyy HH:mm)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'followUpDate',
      header: 'Follow Up Date',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => (
        <span className="text-xs font-mono whitespace-nowrap">
          {formatDateTime(row.followUpDate)}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 16. SalesPerson (Email shown in column)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'salesPerson',
      header: 'SalesPerson',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => {
        const salesPerson = row.salesPerson;
        if (!salesPerson) return <span className="text-gray-400">-</span>;
        
        return (
          <span className="text-sm" title={salesPerson.email}>
            {salesPerson.email || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 17. Notes
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'notes',
      header: 'Notes',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: SalesData) => (
        <span className="text-sm max-w-[200px] truncate block" title={row.notes}>
          {row.notes || '-'}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 18. Actions (Edit/Delete/History)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'actions',
      header: 'Actions',
      className: 'md:w-[1%] md:whitespace-nowrap',
      render: (row: SalesData) => {
        const isOwner = row.salesPerson?._id === config?.currentUser?._id;
        const isAdmin = config?.currentUser?.role === 'SuperAdmin' || config?.currentUser?.role === 'Admin';
        const isUnassigned = !row.salesPerson;
        const canEdit = isUnassigned || isOwner || isAdmin;

        return (
          <div className="flex flex-wrap items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(row)}
                className={`p-1.5 rounded transition-colors ${
                  canEdit 
                    ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500'
                }`}
                title={canEdit ? "Edit" : "Preview"}
              >
                {canEdit ? <Edit2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
            
            {onDelete && isAdmin && (
              <button
                onClick={() => onDelete(row)}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            
            {onHistory && (
              <button
                onClick={() => onHistory(row)}
                className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded text-purple-500 transition-colors"
                title="History"
              >
                <History className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];
};

// ─────────────────────────────────────────────────────────────────────────────
// Default Export
// ─────────────────────────────────────────────────────────────────────────────

export default createSalesDataColumns;

