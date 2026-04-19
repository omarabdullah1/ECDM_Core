'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { MessageSquare, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EditFeedbackDialog from './EditFeedbackDialog';

interface Customer {
  _id?: string;
  customerId?: string;
  name?: string;
  phone?: string;
}

interface CustomerOrder {
  _id?: string;
  engineerName?: string;
  actualVisitDate?: string;
  startDate?: string;
  endDate?: string;
}

interface User {
  _id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface Feedback {
  _id: string;
  customerId?: Customer;
  customerOrderId?: CustomerOrder;
  solvedIssue?: string;
  ratingOperation?: string;
  followUp?: string;
  ratingCustomerService?: string;
  notes?: string;
  updatedBy?: User;
  createdAt: string;
}

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

const Badge = ({ children, variant = 'outline' }: { children: React.ReactNode; variant?: 'default' | 'destructive' | 'outline' }) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

  const variantClasses: Record<string, string> = {
    'default': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'destructive': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'outline': 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  };

  return <span className={`${baseClasses} ${variantClasses[variant]}`}>{children || '-'}</span>;
};

export default function FeedbackPage() {
  const [rows, setRows] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Feedback | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      const { data } = await api.get('/customer/feedback', { params: p });
      setRows(data.data?.data || []);
      setTotal(data.data?.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
      toast.error('Failed to load feedback');
      setRows([]);
    }
    setLoading(false);
  }, [page]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openE = (r: Feedback) => {
    setEditing(r);
    setModal(true);
  };

  const del = async () => { if (!delId) return; try { await api.delete(`/customer/feedback/${delId}`); fetch_(); } catch { } setDelId(null); };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Feedback" icon={MessageSquare} />

      <div className="overflow-x-auto">
        <DataTable
          data={rows as any}
          columns={[
            { key: "customerId.customerId", header: "Customer ID", render: (row: any) => <span className="font-mono text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">{row.customerId?.customerId || '-'}</span> },
            { key: "customerId.name", header: "Name", render: (row: any) => <span className="font-medium whitespace-nowrap">{row.customerId?.name || '-'}</span> },
            { key: "customerId.phone", header: "Phone", render: (row: any) => <span className="font-mono text-sm whitespace-nowrap">{row.customerId?.phone || '-'}</span> },
            { key: "customerOrderId.engineerName", header: "Engineer Name", render: (row: any) => <span className="font-medium whitespace-nowrap">{row.customerOrderId?.engineerName || '-'}</span> },
            { key: "customerOrderId.actualVisitDate", header: "Visit Engineer Date", render: (row: any) => <span className="text-sm whitespace-nowrap">{formatDate(row.customerOrderId?.actualVisitDate)}</span> },
            { key: "customerOrderId.startDate", header: "Start Date", render: (row: any) => <span className="text-sm whitespace-nowrap">{formatDate(row.customerOrderId?.startDate)}</span> },
            { key: "customerOrderId.endDate", header: "End Date", render: (row: any) => <span className="text-sm whitespace-nowrap">{formatDate(row.customerOrderId?.endDate)}</span> },
            { key: "solvedIssue", header: "Solved Issue", render: (row: any) => <span>{row.solvedIssue ? <Badge variant={row.solvedIssue === 'Yes' ? 'default' : 'destructive'}>{row.solvedIssue}</Badge> : '-'}</span> },
            { key: "ratingOperation", header: "Rating Operation", render: (row: any) => <span className="text-sm font-medium">{row.ratingOperation || '-'}</span> },
            { key: "followUp", header: "Follow Up", render: (row: any) => <span className="text-sm">{row.followUp || '-'}</span> },
            { key: "ratingCustomerService", header: "Rating CS", render: (row: any) => <span className="text-sm font-medium">{row.ratingCustomerService || '-'}</span> },
            { key: "updatedBy.email", header: "User Email", render: (row: any) => <span className="text-sm text-[hsl(var(--muted-foreground))] whitespace-nowrap">{row.updatedBy?.email || '-'}</span> },
            { key: "notes", header: "Notes", render: (row: any) => <span className="text-sm max-w-[150px] truncate" title={row.notes}>{row.notes || '-'}</span> },
          ]}
          loading={loading}
          emptyMessage="No feedback found."
          page={page}
          totalPages={tp}
          totalItems={total}
          itemsPerPage={lim}
          onPageChange={setPage}
          renderActions={(row: any) => (
            <div className="flex items-center gap-2">
              <button onClick={() => openE(row as Feedback)} className="p-1 hover:bg-[hsl(var(--muted))] rounded transition-colors" title="Edit"><Edit2 className="h-4 w-4" /></button>
              <button onClick={() => setDelId((row as Feedback)._id)} className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          )}
          defaultVisibility={{
            detailedFeedback: false,
            notes: false,
          }}
        />
      </div>

      {modal && editing && (
        <EditFeedbackDialog
          feedback={editing}
          onClose={() => setModal(false)}
          onSuccess={fetch_}
        />
      )}

      <Dialog open={!!delId} onOpenChange={(open) => !open && setDelId(null)}>
        <DialogContent className="p-6 outline-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete Feedback</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              Are you sure you want to delete this feedback? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={del} 
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 focus-visible:outline-none"
              >
                Delete
              </button>
              <button 
                onClick={() => setDelId(null)} 
                className="flex-1 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-3 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
