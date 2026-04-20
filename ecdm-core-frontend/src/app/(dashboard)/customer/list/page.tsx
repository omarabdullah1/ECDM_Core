'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { Users, Eye, X, Clock, TrendingUp, ShoppingCart, FileText, Edit } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuthStore } from '@/features/auth/useAuth';
import EditCustomerDialog from './EditCustomerDialog';

interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  type: string;
  sector: string;
  address?: string;
  email?: string;
  company?: string;
  isNonPotential?: boolean;
  createdAt: string;
}

interface HistoryItem {
  _id: string;
  date: string;
  status: string;
  source?: string;
  salesPerson?: string;
  issue?: string;
  order?: string;
  notes?: string;
}

interface CustomerHistory {
  marketing: HistoryItem[];
  sales: HistoryItem[];
}

const SECTORS = ['B2B', 'B2C', 'B2G', 'Hybrid', 'Other'];

export default function CustomerListPage() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fSector, setFSector] = useState('');
  const [fPotentialStatus, setFPotentialStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // History modal state
  const [historyModal, setHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<CustomerHistory | null>(null);

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  // Check if user is Admin (SuperAdmin or Manager)
  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Manager';

  const lim = 10;
  const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fSector) p.sector = fSector;
      if (fPotentialStatus) p.potentialStatus = fPotentialStatus;
      const { data } = await api.get('/shared/customers', { params: p });
      setRows(data.data.data);
      setTotal(data.data.pagination.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, fSector, fPotentialStatus]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const openHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setHistoryModal(true);
    setHistoryLoading(true);
    setHistory(null);

    try {
      const { data } = await api.get(`/shared/customers/${customer._id}/history`);
      setHistory(data.data.history);
    } catch {
      setHistory({ marketing: [], sales: [] });
    }
    setHistoryLoading(false);
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch { return '—'; }
  };

  // ─── Column Definitions for DataTable ─────────────────────────────────────────
  const columns = [
    {
      key: 'customerId',
      header: 'Customer ID',
      className: 'md:w-[1%] md:whitespace-nowrap',
      render: (row: Customer) => (
        <span className="font-mono text-xs text-[hsl(var(--primary))] font-semibold">
          {row.customerId || '—'}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      className: 'md:w-auto md:max-w-[150px] md:truncate',
      render: (row: Customer) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'hidden xl:table-cell md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: Customer) => row.phone,
    },
    {
      key: 'potentialStatus',
      header: 'Status',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: Customer) => {
        if (row.isNonPotential) {
          return (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 border border-red-200">
              Non-Potential
            </span>
          );
        }
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            Potential
          </span>
        );
      },
    },
    {
      key: 'address',
      header: 'Address',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: Customer) => (
        <span className="max-w-[200px] truncate block" title={row.address}>
          {row.address || '—'}
        </span>
      ),
    },
    {
      key: 'sector',
      header: 'Sector',
      className: 'hidden xl:table-cell md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: Customer) => (
        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-600">
          {row.sector || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: Customer) => (
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ];

  // ─── Row Actions ──────────────────────────────────────────────────────────────
  const renderActions = (row: Customer) => (
    <div className="flex flex-wrap items-center gap-2">
      {isAdmin && (
        <button
          onClick={() => {
            setCustomerToEdit(row);
            setEditModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
          title="Edit customer (Admin only)"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit
        </button>
      )}
      <Link
        href={`/customer/list/${row._id}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-colors"
      >
        <FileText className="h-3.5 w-3.5" />
        Report
      </Link>
      <button
        onClick={() => openHistory(row)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 transition-colors"
      >
        <Clock className="h-3.5 w-3.5" />
        History
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <PageHeader 
        title="Customers List"
        icon={Users}
        description="Global customer tracking (SSOT)"
      />

      {/* Filter */}
      <div className="flex gap-3 flex-wrap animate-in-slide stagger-2">
        <select
          value={fSector}
          onChange={e => { setFSector(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10"
        >
          <option value="">All Sectors</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={fPotentialStatus}
          onChange={e => { setFPotentialStatus(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10"
        >
          <option value="">All Customers</option>
          <option value="Potential">Potential</option>
          <option value="Non-Potential">Non-Potential</option>
        </select>
      </div>

      {/* DataTable */}
      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        emptyMessage="No customers found."
        page={page}
        totalPages={tp}
        totalItems={total}
        itemsPerPage={lim}
        onPageChange={setPage}
        bulkDeleteEndpoint="/shared/customers/bulk-delete"
        onBulkDeleteSuccess={fetch_}
        onRowClick={(row) => {
          setCustomerToEdit(row);
          setEditModal(true);
        }}
        renderActions={renderActions}
        defaultVisibility={{
          address: false,
          sector: false,
          region: false,
          notes: false,
          createdAt: false,
        }}
      />

      {/* History Modal */}
      {historyModal && selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in transition-all">
          <div className="w-full max-w-2xl rounded-2xl border border-[hsl(var(--border))] modern-glass-card m-auto relative premium-shadow animate-in-slide p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">Customer History</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {selectedCustomer.customerId} • {selectedCustomer.name}
                </p>
              </div>
              <button onClick={() => setHistoryModal(false)}><X className="h-5 w-5" /></button>
            </div>

            {historyLoading ? (
              <div className="text-center text-[hsl(var(--muted-foreground))] py-8">Loading history…</div>
            ) : history ? (
              <div className="space-y-6 pb-8">
                {/* Marketing History */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold">Marketing Pipeline</h3>
                    <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">{history.marketing.length}</span>
                  </div>
                  {history.marketing.length > 0 ? (
                    <div className="space-y-2">
                      {history.marketing.map(item => (
                        <div key={item._id} className="p-3 rounded-xl bg-[hsl(var(--muted))]/30 text-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{item.status}</span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatDate(item.date)}</span>
                          </div>
                          {item.source && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Source: {item.source}</p>}
                          {item.notes && <p className="text-xs mt-1">{item.notes}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">No marketing history.</p>
                  )}
                </div>

                {/* Sales History */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-4 w-4 text-green-500" />
                    <h3 className="font-semibold">Sales Pipeline</h3>
                    <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">{history.sales.length}</span>
                  </div>
                  {history.sales.length > 0 ? (
                    <div className="space-y-2">
                      {history.sales.map(item => (
                        <div key={item._id} className="p-3 rounded-xl bg-[hsl(var(--muted))]/30 text-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{item.status}</span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatDate(item.date)}</span>
                          </div>
                          {item.salesPerson && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Sales Rep: {item.salesPerson}</p>}
                          {item.issue && <p className="text-xs mt-1">Issue: {item.issue}</p>}
                          {item.order && <p className="text-xs mt-1">Order: {item.order}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">No sales history.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-[hsl(var(--muted-foreground))] py-8">Failed to load history.</div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setHistoryModal(false)}
                className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editModal && customerToEdit && (
        <EditCustomerDialog
          customer={customerToEdit}
          readOnly={!isAdmin}
          onClose={() => {
            setEditModal(false);
            setCustomerToEdit(null);
          }}
          onSuccess={() => {
            setEditModal(false);
            setCustomerToEdit(null);
            fetch_();
          }}
        />
      )}
    </div>
  );
}
