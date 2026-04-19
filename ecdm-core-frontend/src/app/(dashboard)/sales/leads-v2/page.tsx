'use client';

/**
 * Sales Leads Page (V2) - Reference implementation using the shared DataTable component
 * with RBAC-protected bulk delete functionality.
 * 
 * This page demonstrates:
 * 1. Using the shared DataTable component
 * 2. RBAC-protected bulk delete (only SuperAdmin/Manager can see checkboxes & delete button)
 * 3. Both methods: bulkDeleteEndpoint (API) and onBulkDelete (custom callback)
 */

import { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import api from '@/lib/axios';
import { Users, Edit2, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  type: string;
  sector: string;
}

interface SalesLead {
  _id: string;
  customerId: Customer;
  issue: string;
  order: string;
  reason: string;
  salesPerson: string;
  status: 'New' | 'Contacted' | 'Negotiation' | 'Closed';
  date: string;
  notes: string;
}

// ─── Status Badge Component ───────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: SalesLead['status'] }) => {
  const styles: Record<string, string> = {
    New: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Contacted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Negotiation: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  const isNew = status === 'New';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.New}`}>
      {isNew && <AlertCircle className="h-3 w-3" />}
      {status}
    </span>
  );
};

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function SalesLeadsPageV2() {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  // Fetch leads from API
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      
      const { data } = await api.get('/sales/leads', { params });
      setLeads(data.data.data);
      setTotalPages(data.data.pagination.pages);
      setTotal(data.data.pagination.total);
    } catch (error) {
      toast.error('Failed to fetch sales leads');
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ─── Column Definitions ───────────────────────────────────────────────────────
  const columns = [
    {
      key: 'customerId.customerId',
      header: 'ID',
      render: (row: SalesLead) => (
        <span className="font-mono text-xs">{row.customerId?.customerId || '-'}</span>
      ),
    },
    {
      key: 'customerId.name',
      header: 'Customer',
      render: (row: SalesLead) => (
        <div>
          <p className="font-medium">{row.customerId?.name || '-'}</p>
          <p className="text-xs text-muted-foreground">{row.customerId?.phone || '-'}</p>
        </div>
      ),
    },
    {
      key: 'customerId.type',
      header: 'Type',
      render: (row: SalesLead) => row.customerId?.type || '-',
    },
    {
      key: 'customerId.sector',
      header: 'Sector',
      render: (row: SalesLead) => row.customerId?.sector || '-',
    },
    {
      key: 'issue',
      header: 'Issue',
      render: (row: SalesLead) => (
        <span className="max-w-[150px] truncate block" title={row.issue}>
          {row.issue || '-'}
        </span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      render: (row: SalesLead) => {
        if (!row.order) return '-';
        const color = row.order === 'Yes' ? 'text-green-600' : 'text-red-600';
        return <span className={`font-semibold ${color}`}>{row.order}</span>;
      },
    },
    {
      key: 'salesPerson',
      header: 'Sales Rep',
      render: (row: SalesLead) => row.salesPerson || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: SalesLead) => <StatusBadge status={row.status} />,
    },
    {
      key: 'date',
      header: 'Date',
      render: (row: SalesLead) => 
        row.date ? new Date(row.date).toLocaleDateString() : '-',
    },
  ];

  // ─── Row Actions ──────────────────────────────────────────────────────────────
  const renderActions = (row: SalesLead) => (
    <div className="flex items-center gap-2">
      <button
        className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
        title="Edit"
      >
        <Edit2 className="h-4 w-4" />
      </button>
    </div>
  );

  // ─── Custom Bulk Delete Handler (Alternative to bulkDeleteEndpoint) ───────────
  // Example: Use this if you need custom logic before/after deletion
  const handleBulkDelete = async (ids: string[]) => {
    // Custom pre-delete logic (e.g., validation, logging)
    console.log(`Bulk deleting ${ids.length} sales leads:`, ids);
    
    // Call the API
    await api.post('/sales/leads/bulk-delete', { ids });
    
    // Custom post-delete logic (e.g., analytics tracking)
    console.log('Bulk delete completed successfully');
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-[hsl(var(--primary))]" />
          <h1 className="text-2xl font-bold">Sales Leads (V2)</h1>
        </div>
        <button
          onClick={fetchLeads}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap animate-in-slide stagger-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* 
        ═══════════════════════════════════════════════════════════════════════════
        DataTable with RBAC-Protected Bulk Delete
        ═══════════════════════════════════════════════════════════════════════════
        
        Option 1: Using bulkDeleteEndpoint (Recommended for standard API endpoints)
        The component will automatically POST to this endpoint with { ids: string[] }
        
        Option 2: Using onBulkDelete callback (For custom delete logic)
        Pass a custom async function that receives the array of IDs
        
        Both options:
        - Checkboxes and "Delete Selected" button are ONLY visible to SuperAdmin/Manager
        - The button only appears when rows are selected
        - Confirmation dialog is shown before deletion
      */}
      <DataTable
        data={leads}
        columns={columns}
        loading={loading}
        emptyMessage="No sales leads found."
        page={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={LIMIT}
        onPageChange={setPage}
        // ─── Option 1: Use API endpoint directly ─────────────────────────────────
        bulkDeleteEndpoint="/sales/leads/bulk-delete"
        // ─── Option 2: Use custom callback (uncomment to use instead) ────────────
        // onBulkDelete={handleBulkDelete}
        // ─── Callback after successful deletion ──────────────────────────────────
        onBulkDeleteSuccess={fetchLeads}
        // ─── Row actions (edit, view, etc.) ──────────────────────────────────────
        renderActions={renderActions}
      />

      {/* Info Panel */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 text-sm text-[hsl(var(--muted-foreground))]">
        <strong>Admin Note:</strong> Bulk delete functionality is only available to SuperAdmin and Manager roles. 
        Non-admin users will see the table without selection checkboxes.
      </div>
    </div>
  );
}
