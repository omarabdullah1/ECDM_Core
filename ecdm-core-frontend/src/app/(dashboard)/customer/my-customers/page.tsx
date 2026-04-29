'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { Users, Eye, FileText, Search, Activity, UserCheck, Phone, Building, Clock, Edit } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuthStore } from '@/features/auth/useAuth';
import { useT } from '@/i18n/useT';
import toast from 'react-hot-toast';
import EditCustomerDialog from '../list/EditCustomerDialog';

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
  createdAt: string;
  updatedAt: string;
  csPerson?: string;
  progress?: string;
  lastInteraction?: string;
}

export default function CSMyCustomersPage() {
  const { user } = useAuthStore();
  const t = useT();
  const [rows, setRows] = useState<MyCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Report modal state
  const [reportModal, setReportModal] = useState(false);
  const [customerForReport, setCustomerForReport] = useState<MyCustomer | null>(null);

  const lim = 10;
  const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim, my: 'true' };
      if (search) p.search = search;
      
      const { data } = await api.get('/shared/customers/my-customers', { params: p });
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

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isNew = (dateStr: string) => {
    const createdDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 1; // Last 24 hours
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
          <div className="flex items-center gap-2">
            <span className="font-bold text-[13px]">{row.name}</span>
            {isNew(row.createdAt) && (
              <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md animate-pulse">NEW</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
              <Phone size={10} /> {row.phone}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'csPerson',
      header: 'CS Person',
      className: 'md:w-[15%]',
      render: (row: MyCustomer) => (
        <div className="flex flex-col">
          <span className="text-[11px] font-medium truncate max-w-[150px] block" title={row.csPerson}>
            {row.csPerson || '—'}
          </span>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-tighter mt-0.5">Responsible</span>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      className: 'md:w-[15%]',
      render: (row: MyCustomer) => {
        const status = row.progress || 'Active';
        let colorClass = 'bg-gray-500/10 text-gray-500';
        
        if (status.includes('Settled')) colorClass = 'bg-emerald-500/10 text-emerald-600';
        else if (status.includes('Operations')) colorClass = 'bg-amber-500/10 text-amber-600';
        else if (status.includes('Follow-up')) colorClass = 'bg-blue-500/10 text-blue-600';
        else if (status.includes('Feedback')) colorClass = 'bg-purple-500/10 text-purple-600';

        return (
          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${colorClass} border border-current/10 shadow-sm`}>
            {status}
          </span>
        );
      },
    },
    {
      key: 'lastInteraction',
      header: 'Last Interaction',
      className: 'md:w-[20%]',
      render: (row: MyCustomer) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1 italic font-medium" title={row.lastInteraction}>
            "{row.lastInteraction || 'Modified customer record'}"
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Added',
      className: 'md:w-[10%]',
      render: (row: MyCustomer) => (
        <div className="flex flex-col">
          <span className="text-[11px] font-bold">
            {formatDate(row.createdAt)}
          </span>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-tighter">Registration</span>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Update',
      className: 'md:w-[10%]',
      render: (row: MyCustomer) => (
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-blue-600">
            {formatDate(row.updatedAt)}
          </span>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-tighter">Modification</span>
        </div>
      ),
    },
  ];

  const renderActions = (row: MyCustomer) => (
    <div className="flex items-center gap-2">
      <Link
        href={`/customer/list/${row._id}`}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-black text-white shadow-lg hover:bg-gray-800 transition-all border border-black/10 group"
      >
        <FileText size={14} className="group-hover:scale-110 transition-transform" />
        Full Report
      </Link>
    </div>
  );

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      <PageHeader 
        title="My Customers (CS)"
        icon={UserCheck}
        description="Customers you have actively modified or engaged with"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))] group-focus-within:text-[hsl(var(--primary))] transition-colors" />
          <input
            type="text"
            placeholder="Search by name, ID, phone..."
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
          emptyMessage="No customers found. Start interacting with customers to build your list."
          page={page}
          totalPages={tp}
          totalItems={total}
          itemsPerPage={lim}
          onPageChange={setPage}
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

