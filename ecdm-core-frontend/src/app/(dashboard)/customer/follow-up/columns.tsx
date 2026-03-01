'use client';

import { Phone, CheckCircle, Edit2, Trash2 } from 'lucide-react';

interface Customer {
  name: string;
  phone?: string;
  address?: string;
  region?: string;
}

export interface FollowUp {
  _id: string;
  status: 'Pending' | 'Contacted' | 'Scheduled' | 'Completed' | 'Canceled';
  solvedIssue: boolean;
  followUpDate: string;
  customer?: Customer;
  csr?: { firstName: string; lastName: string };
  workOrder?: { typeOfOrder: string; issue?: string };
  leadId?: { customerId?: Customer };
  salesDataId?: { customer?: Customer };
  notes?: string;
  createdAt: string;
}

// Helper to get source badge
const getSource = (row: FollowUp) => {
  if (row.workOrder) return { type: 'Work Order', className: 'bg-blue-100 text-blue-700' };
  if (row.leadId) return { type: 'Sales Lead', className: 'bg-purple-100 text-purple-700' };
  if (row.salesDataId) return { type: 'Sales Data', className: 'bg-green-100 text-green-700' };
  return { type: 'Manual', className: 'bg-gray-100 text-gray-700' };
};

// Helper to get customer (SSOT pattern with dual-source fallback)
const getCustomer = (row: FollowUp): Customer | undefined => {
  return row.customer || row.leadId?.customerId || row.salesDataId?.customer;
};

// Helper to get issue/notes
const getIssueOrNotes = (row: FollowUp): string => {
  return row.workOrder?.issue || row.notes || '—';
};

// Status badge mapping
const statusConfig: Record<string, { label: string; className: string }> = {
  Pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  Contacted: { label: 'Contacted', className: 'bg-blue-100 text-blue-700' },
  Scheduled: { label: 'Scheduled', className: 'bg-purple-100 text-purple-700' },
  Completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  Canceled: { label: 'Canceled', className: 'bg-gray-100 text-gray-700' },
};

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export const createColumns = (
  onStatusUpdate: (id: string, status: string) => Promise<void>,
  onEdit: (row: FollowUp) => void,
  onDelete: (id: string) => void
): Column<FollowUp>[] => [
  {
    key: 'source',
    header: 'Source',
    render: (row) => {
      const source = getSource(row);
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${source.className}`}>
          {source.type}
        </span>
      );
    },
  },
  {
    key: 'customer.name',
    header: 'Customer',
    render: (row) => {
      const customer = getCustomer(row);
      return <span className="font-medium">{customer?.name || '—'}</span>;
    },
  },
  {
    key: 'customer.phone',
    header: 'Phone',
    render: (row) => {
      const customer = getCustomer(row);
      return <span className="text-[hsl(var(--muted-foreground))]">{customer?.phone || '—'}</span>;
    },
  },
  {
    key: 'customer.address',
    header: 'Address',
    render: (row) => {
      const customer = getCustomer(row);
      return <span className="text-[hsl(var(--muted-foreground))]">{customer?.address || '—'}</span>;
    },
  },
  {
    key: 'customer.region',
    header: 'Region',
    render: (row) => {
      const customer = getCustomer(row);
      return <span className="text-[hsl(var(--muted-foreground))]">{customer?.region || '—'}</span>;
    },
  },
  {
    key: 'csr',
    header: 'CSR',
    render: (row) => {
      const csr = row.csr;
      return csr ? `${csr.firstName} ${csr.lastName}` : '—';
    },
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => {
      const status = row.status;
      const config = statusConfig[status] || statusConfig.Pending;
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
          {config.label}
        </span>
      );
    },
  },
  {
    key: 'followUpDate',
    header: 'Follow Up Date',
    render: (row) => {
      const date = row.followUpDate;
      return date ? new Date(date).toLocaleDateString('en-GB') : '—';
    },
  },
  {
    key: 'notes',
    header: 'Issue / Notes',
    render: (row) => {
      const text = getIssueOrNotes(row);
      return (
        <span className="max-w-xs truncate block" title={text}>
          {text}
        </span>
      );
    },
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (row) => {
      const date = row.createdAt;
      return date ? new Date(date).toLocaleDateString('en-GB') : '—';
    },
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) => {
      const status = row.status;
      const id = row._id;

      return (
        <div className="flex items-center gap-2">
          {/* Quick Action: Mark as Contacted (only if Pending) */}
          {status === 'Pending' && (
            <button
              onClick={() => onStatusUpdate(id, 'Contacted')}
              className="p-1 hover:bg-blue-50 rounded text-blue-600 transition-colors"
              title="Mark as Contacted"
            >
              <Phone className="h-4 w-4" />
            </button>
          )}

          {/* Quick Action: Mark as Completed (if Pending or Contacted) */}
          {(status === 'Pending' || status === 'Contacted' || status === 'Scheduled') && (
            <button
              onClick={() => onStatusUpdate(id, 'Completed')}
              className="p-1 hover:bg-green-50 rounded text-green-600 transition-colors"
              title="Mark as Completed"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}

          {/* Standard Edit Button */}
          <button
            onClick={() => onEdit(row)}
            className="p-1 hover:bg-[hsl(var(--muted))] rounded text-[hsl(var(--foreground))] transition-colors"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>

          {/* Standard Delete Button */}
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
