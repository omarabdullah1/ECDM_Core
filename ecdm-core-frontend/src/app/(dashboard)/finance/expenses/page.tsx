'use client';

import { Pagination } from '@/components/shared/Pagination';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  CreditCard,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ExpenseRow {
  sparePartsId: string;
  expenseId: string;
  expenseDate: string;
  expenseType: string;
  invoices: string;
  description: string;
  amount: string;
  paymentMethod: string;
  paidBy: string;
  notes: string;
}

const universalExtract = (rawData: any): any[] => {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
  if (rawData.data?.data && Array.isArray(rawData.data.data)) return rawData.data.data;
  const possibleArray = Object.values(rawData).find(val => Array.isArray(val));
  return (possibleArray as any[]) || [];
};

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const labelCls = 'block text-sm font-medium text-[hsl(var(--foreground))] mb-1';

export default function ExpensesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expensesData, setExpensesData] = useState<ExpenseRow[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Inventory items for dropdown
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Fetch inventory items when modal opens
  useEffect(() => {
    if (addModalOpen) {
      setLoadingInventory(true);
      api.get('/finance/inventory?limit=1000')
        .then(res => {
          const items = res.data?.data || res.data || [];
          setInventoryItems(Array.isArray(items) ? items : []);
        })
        .catch(() => setInventoryItems([]))
        .finally(() => setLoadingInventory(false));
    }
  }, [addModalOpen]);

  const fetchExpensesData = async (isSync = false) => {
    if (isSync) {
      setSyncing(true);
    } else {
      setIsLoading(true);
    }
    setApiError(null);

    try {
      const [expensesRes] = await Promise.all([
        api.get('/finance/expenses?limit=1000').catch(() => ({ data: [] }))
      ]);

      const rawExpenses = universalExtract(expensesRes.data || expensesRes);

      const rows: ExpenseRow[] = rawExpenses.map((item: any, index: number) => ({
        sparePartsId: String(item.sparePartsId || '-'),
        expenseId: String(item.expenseId || `EXP-${index + 1}`),
        expenseDate: item.expenseDate ? new Date(item.expenseDate).toLocaleDateString() : 'dd/mm/yyyy',
        expenseType: String(item.expenseType || '-'),
        invoices: 'File', // Represents the Document icon
        description: String(item.description || '-'),
        amount: item.amount ? `EGP ${Number(item.amount).toFixed(2)}` : 'EGP 0.00',
        paymentMethod: String(item.paymentMethod || '-'),
        paidBy: String(item.paidBy || '-'),
        notes: String(item.notes || '-')
      }));

      setExpensesData(rows);
    } catch (error: any) {
      console.error('Failed to generate expenses report:', error);
      setApiError(error.message || 'Unknown fetching error');
    } finally {
      setIsLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const role = user.role;
    if (role !== 'Admin' && role !== 'SuperAdmin') {
      router.push('/dashboard');
      return;
    }

    fetchExpensesData();
  }, [user, router]);

  const handleSync = () => {
    fetchExpensesData(true);
  };

  const filteredData = expensesData.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      row.sparePartsId.toLowerCase().includes(q) ||
      row.expenseId.toLowerCase().includes(q) ||
      row.expenseType.toLowerCase().includes(q) ||
      row.description.toLowerCase().includes(q) ||
      row.paymentMethod.toLowerCase().includes(q) ||
      row.paidBy.toLowerCase().includes(q) ||
      row.notes.toLowerCase().includes(q)
    );
  });

  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  const getPaymentMethodBadgeClass = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'bg-green-100 text-green-800';
      case 'bank transfer':
      case 'banktransfer':
      case 'bank-transfer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.post('/finance/expenses', {
        sparePartsId: formData.sparePartsId || undefined,
        expenseId: formData.expenseId,
        expenseDate: formData.expenseDate ? new Date(formData.expenseDate).toISOString() : undefined,
        expenseType: formData.expenseType,
        invoicesUrl: formData.invoicesUrl || undefined,
        description: formData.description,
        amount: Number(formData.amount) || 0,
        paymentMethod: formData.paymentMethod,
        paidBy: formData.paidBy,
        notes: formData.notes || undefined
      });

      setFormData(initialFormData);
      setAddModalOpen(false);
      await fetchExpensesData(true); // Refresh data
    } catch (error: any) {
      console.error('Failed to add expense:', error);
      console.error('Error response:', error.response);
      const msg = error.response?.data?.message || error.message || 'Failed to add expense';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">General Expenses</h1>
              <p className="text-sm text-muted-foreground">
                Tracking general company expenses
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? 'Syncing...' : 'Sync Report'}
            </button>
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="h-4 w-4" />
              Add Expense
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredData.length} expense(s) found
          </span>
        </div>

        {apiError && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            {apiError}
          </div>
        )}

        {isLoading ? (
          <TableSkeleton rows={10} columns={10} height="h-12" />
        ) : (
          <>
            <div className="overflow-x-auto min-w-[1500px] rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="border-b px-3 py-2 text-left font-medium">Spare Parts ID</th>
                    <th className="border-b px-3 py-2 text-left font-medium">ExpenseID</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Expense Date</th>
                    <th className="border-b px-3 py-2 text-left font-medium">ExpenseType</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Invoices</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Description</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Amount</th>
                    <th className="border-b px-3 py-2 text-left font-medium">PaymentMethod</th>
                    <th className="border-b px-3 py-2 text-left font-medium">PaidBy</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border-b px-3 py-8 text-center text-muted-foreground">
                        {searchTerm ? 'No expenses match your search' : 'No expense data found'}
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((row) => (
                      <tr key={row.expenseId} className="hover:bg-muted/50">
                        <td className="border-b px-3 py-2">{row.sparePartsId}</td>
                        <td className="border-b px-3 py-2 font-medium">{row.expenseId}</td>
                        <td className="border-b px-3 py-2">{row.expenseDate}</td>
                        <td className="border-b px-3 py-2">{row.expenseType}</td>
                        <td className="border-b px-3 py-2 text-center">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        </td>
                        <td className="border-b px-3 py-2">{row.description}</td>
                        <td className="border-b px-3 py-2">{row.amount}</td>
                        <td className="border-b px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getPaymentMethodBadgeClass(row.paymentMethod)}`}>
                            {row.paymentMethod}
                          </span>
                        </td>
                        <td className="border-b px-3 py-2">{row.paidBy}</td>
                        <td className="border-b px-3 py-2 text-muted-foreground">{row.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredData.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {addModalOpen && (
        /* Add Expense Modal */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex justify-between items-center bg-[hsl(var(--muted))]/50">
            <div>
              <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">Add New Expense</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Fill out the details below to record a general expense.</p>
            </div>
            <button
              onClick={() => setAddModalOpen(false)}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors p-2 rounded-full hover:bg-[hsl(var(--muted))]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="px-6 py-4 mb-4 mx-6 mt-6 first:mt-0 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{submitError}</p>
            </div>
          )}

          {/* Modal Body (Scrollable) */}
          <div className="p-6 overflow-y-auto">
            <form className="space-y-5" onSubmit={handleSubmit}>

              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Expense ID</label>
                  <input
                    type="text"
                    value={formData.expenseId}
                    onChange={(e) => setFormData({ ...formData, expenseId: e.target.value })}
                    className={iCls}
                    placeholder="e.g. EXP-001"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Expense Date</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className={iCls}
                    required
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Expense Type</label>
                  <input
                    type="text"
                    value={formData.expenseType}
                    onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                    className={iCls}
                    placeholder="e.g. Utility, Maintenance"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Amount (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount === '' ? '' : String(formData.amount)}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                    className={iCls}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className={iCls}
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Check">Check</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Paid By</label>
                  <input
                    type="text"
                    value={formData.paidBy}
                    onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                    className={iCls}
                    placeholder="Name of payer"
                    required
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div>
                <label className={labelCls}>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={iCls}
                  placeholder="Brief description of the expense"
                  required
                />
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Spare Part (Optional)</label>
                  <select
                    value={formData.sparePartsId}
                    onChange={(e) => setFormData({ ...formData, sparePartsId: e.target.value })}
                    className={iCls}
                  >
                    <option value="">Select Spare Part (Optional)</option>
                    {loadingInventory ? (
                      <option disabled>Loading items...</option>
                    ) : inventoryItems.length === 0 ? (
                      <option disabled>No items available</option>
                    ) : (
                      inventoryItems
                        .filter(item => item.stockNumber > 0) // Only show items in stock
                        .map(item => (
                          <option key={item._id} value={item._id}>
                            {item.itemName} (Stock: {item.stockNumber})
                          </option>
                        ))
                    )}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Upload Invoice (URL/File)</label>
                  <input
                    type="text"
                    value={formData.invoicesUrl}
                    onChange={(e) => setFormData({ ...formData, invoicesUrl: e.target.value })}
                    className={iCls}
                    placeholder="Link to invoice..."
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={iCls}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              {/* Modal Footer / Actions */}
              <div className="pt-4 mt-2 border-t border-[hsl(var(--border))] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add Expense
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// Form state
type ExpenseFormData = {
  sparePartsId: string;
  expenseId: string;
  expenseDate: string;
  expenseType: string;
  invoicesUrl: string;
  description: string;
  amount: number | string; // allow empty string for uncontrolled input
  paymentMethod: string;
  paidBy: string;
  notes: string;
};

const initialFormData: ExpenseFormData = {
  sparePartsId: '',
  expenseId: '',
  expenseDate: '',
  expenseType: '',
  invoicesUrl: '',
  description: '',
  amount: '', // start empty so it's not 0
  paymentMethod: 'Cash',
  paidBy: '',
  notes: ''
};