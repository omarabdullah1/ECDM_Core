'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { Users, Eye, FileText, Search, Activity, UserCheck, Phone, Building, Mail } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuthStore } from '@/features/auth/useAuth';
import { useT } from '@/i18n/useT';
import toast from 'react-hot-toast';

interface MyCustomer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  sector?: string;
  type?: string;
  progress: string;
  lastIssue: string;
}

export default function MyCustomersPage() {
  const { user } = useAuthStore();
  const t = useT();
  const [rows, setRows] = useState<MyCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const lim = 10;
  const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (search) p.search = search;
      
      const { data } = await api.get('/sales/customers/my-customers', { params: p });
      setRows(data.data.data || []);
      setTotal(data.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch my customers:', err);
      toast.error('Failed to load your customers');
      setRows([]);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (['closed', 'completed', 'success', 'yes', 'accepted', 'won'].some(k => s.includes(k))) 
      return 'bg-green-500/10 text-green-600 border border-green-200/50';
    if (['negotiation', 'pending', 'contacted', 'in progress', 'scheduled'].some(k => s.includes(k)))
      return 'bg-yellow-500/10 text-yellow-600 border border-yellow-200/50';
    if (['rejected', 'canceled', 'no', 'non-potential', 'lost'].some(k => s.includes(k)))
      return 'bg-red-500/10 text-red-600 border border-red-200/50';
    return 'bg-blue-500/10 text-blue-600 border border-blue-200/50';
  };

  const columns = [
    {
      key: 'customerId',
      header: 'ID',
      className: 'md:w-[1%] md:whitespace-nowrap',
      render: (row: MyCustomer) => (
        <span className="font-mono text-xs font-semibold text-[hsl(var(--primary))]">
          {row.customerId || '—'}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Customer',
      className: 'md:w-1/4',
      render: (row: MyCustomer) => (
        <div className="flex flex-col">
          <span className="font-bold text-[13px]">{row.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
              <Phone size={10} /> {row.phone}
            </span>
            {row.company && (
               <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
               <Building size={10} /> {row.company}
             </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Status / Progress',
      className: 'md:w-1/5',
      render: (row: MyCustomer) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(row.progress)}`}>
          {row.progress}
        </span>
      ),
    },
    {
      key: 'lastIssue',
      header: 'Last Interaction',
      className: 'md:w-1/3',
      render: (row: MyCustomer) => (
        <div className="max-w-[300px] truncate group relative">
          <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1" title={row.lastIssue}>
            {row.lastIssue || <span className="italic">No detailed history recorded</span>}
          </p>
        </div>
      ),
    },
  ];

  const renderActions = (row: MyCustomer) => (
    <div className="flex items-center gap-2">
      <Link
        href={`/customer/list/${row._id}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-black shadow-sm hover:bg-black hover:text-white transition-all border border-black/5"
      >
        <FileText size={14} />
        Full Report
      </Link>
    </div>
  );

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      <PageHeader 
        title={t.nav.myCustomers}
        icon={UserCheck}
        description="Customers you have actively engaged with across the sales pipeline"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))] group-focus-within:text-[hsl(var(--primary))] transition-colors" />
          <input
            type="text"
            placeholder="Search by name, ID, phone or company..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary))]/5 focus:border-[hsl(var(--primary))]/40 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/30 px-4 py-2 rounded-2xl border border-[hsl(var(--border))]/40">
           <Activity size={14} className="text-[hsl(var(--primary))]" />
           Total: {total} Customers
        </div>
      </div>

      <div className="premium-glass-container rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <DataTable
          data={rows}
          columns={columns}
          loading={loading}
          emptyMessage="No customers found. Start engaging with leads to build your customer list."
          page={page}
          totalPages={tp}
          totalItems={total}
          itemsPerPage={lim}
          onPageChange={setPage}
          onRowClick={(row) => window.location.href = `/customer/list/${row._id}`}
          renderActions={renderActions}
          className="modern-table"
        />
      </div>

      <style jsx global>{`
        .premium-glass-container {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
          backdrop-filter: blur(10px);
        }
        .modern-table thead th {
          background: transparent !important;
          border-bottom: 1px solid rgba(0,0,0,0.05) !important;
          color: #8b919e !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          padding: 1.5rem 1rem !important;
        }
        .modern-table tbody tr {
          transition: all 0.2s ease !important;
        }
        .modern-table tbody tr:hover {
          background: rgba(var(--primary-rgb), 0.02) !important;
          transform: scale(0.998);
        }
        .modern-table td {
          padding: 1.25rem 1rem !important;
        }
      `}</style>
    </div>
  );
}

