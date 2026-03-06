'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { Users, Eye, X, Clock, TrendingUp, ShoppingCart, FileText } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';

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
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fSector, setFSector] = useState('');
  const [loading, setLoading] = useState(true);
  
  // History modal state
  const [historyModal, setHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  
  const lim = 10;
  const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fSector) p.sector = fSector;
      const { data } = await api.get('/shared/customers', { params: p });
      setRows(data.data.data);
      setTotal(data.data.pagination.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, fSector]);
  
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
      render: (row: Customer) => (
        <span className="font-mono text-xs text-[hsl(var(--primary))] font-semibold">
          {row.customerId || '—'}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (row: Customer) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row: Customer) => row.phone,
    },
    {
      key: 'address',
      header: 'Address',
      render: (row: Customer) => (
        <span className="max-w-[200px] truncate block" title={row.address}>
          {row.address || '—'}
        </span>
      ),
    },
    {
      key: 'sector',
      header: 'Sector',
      render: (row: Customer) => (
        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-600">
          {row.sector || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: Customer) => (
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ];

  // ─── Row Actions ──────────────────────────────────────────────────────────────
  const renderActions = (row: Customer) => (
    <div className="flex items-center gap-2">
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

  const COLUMNS = ['Customer ID', 'Name', 'Phone', 'Address', 'Sector', 'Created', 'Actions'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-[hsl(var(--primary))]" />
          <h1 className="text-2xl font-bold">Customers List</h1>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Global customer tracking (SSOT)
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={fSector}
          onChange={e => { setFSector(e.target.value); setPage(1); }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm"
        >
          <option value="">All Sectors</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* DataTable with RBAC-Protected Bulk Delete */}
      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        emptyMessage="No customers found."
        page={page}
        totalPages={tp}
        onPageChange={setPage}
        bulkDeleteEndpoint="/shared/customers/bulk-delete"
        onBulkDeleteSuccess={fetch_}
        renderActions={renderActions}
      />

      {/* History Modal */}
      {historyModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
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
              <div className="space-y-6">
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
    </div>
  );
}
