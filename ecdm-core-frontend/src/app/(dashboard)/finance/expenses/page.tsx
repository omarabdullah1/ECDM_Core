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
import { PageHeader } from '@/components/layout/PageHeader';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ExpenseRow {
  _id: string;
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
  invoiceFile?: string;
  source?: string;
  employeeId?: any;
}


const universalExtract = (rawData: any): any[] => {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
  if (rawData.data?.data && Array.isArray(rawData.data.data)) return rawData.data.data;
  const possibleArray = Object.values(rawData).find(val => Array.isArray(val));
  return (possibleArray as any[]) || [];
};

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const labelCls = 'block text-sm font-medium text-[hsl(var(--foreground))] mb-1';

const formatMoney = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? 'EGP 0.00' : `EGP ${num.toFixed(2)}`;
};

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
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [internalPreviewMode, setInternalPreviewMode] = useState(true);
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const effectivelyReadOnly = modalOpen && selectedExpense && internalPreviewMode;
  const isEditing = modalOpen && selectedExpense && !internalPreviewMode;
  const isAdding = modalOpen && !selectedExpense;

  // Selection data
  const [InventoryItems, setInventoryItems] = useState<any[]>([]);
  const [employeeItems, setEmployeeItems] = useState<any[]>([]);
  const [loadingSelections, setLoadingSelections] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch selection items when modal opens
  useEffect(() => {
    if (modalOpen) {
      setLoadingSelections(true);
      Promise.all([
        api.get('/operations/inventory?limit=1000').catch(() => ({ data: [] })),
        api.get('/hr/users?limit=1000').catch(() => ({ data: [] }))
      ]).then(([InventoryRes, employeesRes]) => {
        const pItems = InventoryRes.data?.data || InventoryRes.data || [];
        const eItems = employeesRes.data?.data || employeesRes.data || [];
        setInventoryItems(Array.isArray(pItems) ? pItems : []);
        setEmployeeItems(Array.isArray(eItems) ? eItems : []);
      }).finally(() => setLoadingSelections(false));
    }
  }, [modalOpen]);


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
        amount: formatMoney(item.amount),
        paymentMethod: String(item.paymentMethod || '-'),
        paidBy: String(item.paidBy || '-'),
        notes: String(item.notes || '-'),
        _raw: item // Keep raw item for editing
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

  const openAdd = () => {
    setSelectedExpense(null);
    setFormData(initialFormData);
    setInternalPreviewMode(false);
    setModalOpen(true);
  };

  const openPreview = (expense: ExpenseRow) => {
    // If it's a real item with _raw, use it
    const raw = (expense as any)._raw || expense;
    setSelectedExpense(raw);
    setFormData({
      sparePartsId: raw.sparePartsId || '',
      expenseId: raw.expenseId || '',
      expenseDate: raw.expenseDate ? new Date(raw.expenseDate).toISOString().split('T')[0] : '',
      expenseType: raw.expenseType || '',
      invoicesUrl: raw.invoicesUrl || '',
      description: raw.description || '',
      amount: raw.amount || '',
      paymentMethod: raw.paymentMethod || 'Cash',
      paidBy: raw.paidBy || '',
      notes: raw.notes || ''
    });
    setInternalPreviewMode(true);
    setModalOpen(true);
  };

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
      const payload = new FormData();
      if (formData.sparePartsId) payload.append('sparePartsId', formData.sparePartsId);
      if (!isAdding) payload.append('expenseId', formData.expenseId);
      if (formData.expenseDate) payload.append('expenseDate', new Date(formData.expenseDate).toISOString());
      payload.append('expenseType', formData.expenseType);
      payload.append('description', formData.description);
      payload.append('amount', String(formData.amount || 0));
      payload.append('paymentMethod', formData.paymentMethod);
      payload.append('paidBy', formData.paidBy);
      if (formData.employeeId) payload.append('employeeId', formData.employeeId);
      if (formData.notes) payload.append('notes', formData.notes);
      
      if (selectedFile) {
        payload.append('invoice', selectedFile);
      } else if (formData.invoicesUrl) {
        payload.append('invoicesUrl', formData.invoicesUrl);
      }

      if (isAdding) {
        await api.post('/finance/expenses', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Expense added successfully');
      } else {
        await api.put(`/finance/expenses/${selectedExpense._id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Expense updated successfully');
      }

      setFormData(initialFormData);
      setSelectedFile(null);
      setModalOpen(false);
      await fetchExpensesData(true);
    } catch (error: any) {
      console.error('Failed to save expense:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to save expense';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!user) return null;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="General Expenses"
        icon={CreditCard}
        description="Tracking general company expenses"
        actions={
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? 'Syncing...' : 'Sync Report'}
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 border-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              Add Expense
            </button>
          </>
        }
      />

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
            <div className="w-full overflow-x-auto custom-table-scrollbar">
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
                      <tr key={row._id || row.expenseId} className="hover:bg-muted/50 cursor-pointer" onClick={() => openPreview(row)}>
                        <td className="border-b px-3 py-2 text-xs font-mono">{row.sparePartsId}</td>
                        <td className="border-b px-3 py-2 font-medium">
                          <div className="flex items-center gap-2">
                            {row.source === 'Salary' && <TrendingUp className="h-3 w-3 text-blue-500" title="Salary Expense" />}
                            {row.source === 'Inventory' && <Search className="h-3 w-3 text-orange-500" title="Inventory Expense" />}
                            {row.expenseId}
                          </div>
                        </td>
                        <td className="border-b px-3 py-2">{row.expenseDate}</td>
                        <td className="border-b px-3 py-2">
                          <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {row.expenseType}
                          </span>
                        </td>
                        <td className="border-b px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          {(row.invoiceFile || row.invoices === 'File') ? (
                            <a 
                              href={row.invoiceFile ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${row.invoiceFile}` : '#'} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-primary hover:underline hover:scale-110 transition-transform inline-block"
                            >
                              <FileSpreadsheet className="h-4 w-4" />
                            </a>
                          ) : '-'}
                        </td>
                        <td className="border-b px-3 py-2 text-sm truncate max-w-[150px]" title={row.description}>{row.description}</td>
                        <td className="border-b px-3 py-2 font-bold">{row.amount}</td>
                        <td className="border-b px-3 py-2 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getPaymentMethodBadgeClass(row.paymentMethod)}`}>
                            {row.paymentMethod}
                          </span>
                        </td>
                        <td className="border-b px-3 py-2">{row.paidBy}</td>
                        <td className="border-b px-3 py-2 text-muted-foreground text-sm truncate max-w-[100px]" title={row.notes}>{row.notes}</td>
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

      {modalOpen && (
        /* Expense Modal */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
        <div className="rounded-2xl border border-[hsl(var(--border))] modern-glass-card premium-shadow animate-in-slide m-auto relative shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex justify-between items-center bg-[hsl(var(--muted))]/50">
            <div>
              <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">
                {isAdding ? 'Add New Expense' : (effectivelyReadOnly ? 'Expense Preview' : 'Edit Expense')}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                {isAdding ? 'Fill out the details below to record a general expense.' : (effectivelyReadOnly ? 'Viewing expense details in read-only mode.' : 'Modify the details of this expense below.')}
                {effectivelyReadOnly && <span className="ml-2 text-amber-600 font-semibold">• Preview Mode</span>}
              </p>
            </div>
            <button
              onClick={() => setModalOpen(false)}
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
                    value={isAdding ? 'Auto-generated' : formData.expenseId}
                    onChange={(e) => setFormData({ ...formData, expenseId: e.target.value })}
                    className={`${iCls} font-mono`}
                    placeholder="e.g. EXP-001"
                    required={!isAdding}
                    disabled={effectivelyReadOnly || isAdding}
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
                    disabled={effectivelyReadOnly}
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Expense Type</label>
                  <select
                    value={formData.expenseType}
                    onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                    className={iCls}
                    required
                    disabled={effectivelyReadOnly}
                  >
                    <option value="">Select Category</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Utility">Utility</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Rent">Rent</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Other">Other</option>
                  </select>
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
                    disabled={effectivelyReadOnly}
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
                    disabled={effectivelyReadOnly}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Check">Check</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Paid By</label>
                  <select
                    value={formData.employeeId || (formData.paidBy === 'Other' ? 'other' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'other') {
                        setFormData({ ...formData, employeeId: '', paidBy: '' });
                      } else {
                        const emp = employeeItems.find(item => item._id === val);
                        setFormData({ 
                          ...formData, 
                          employeeId: val, 
                          paidBy: emp ? `${emp.firstName} ${emp.lastName}` : '' 
                        });
                      }
                    }}
                    className={iCls}
                    required
                    disabled={effectivelyReadOnly}
                  >
                    <option value="">Select Employee</option>
                    {employeeItems.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                    <option value="other">Other (Manual Entry)</option>
                  </select>
                  {(!formData.employeeId || formData.employeeId === '') && (
                    <input
                      type="text"
                      value={formData.paidBy}
                      onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                      className={`${iCls} mt-2`}
                      placeholder="Name of payer"
                      required
                      disabled={effectivelyReadOnly}
                    />
                  )}
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
                  disabled={effectivelyReadOnly}
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
                    disabled={effectivelyReadOnly}
                  >
                    <option value="">Select Spare Part (Optional)</option>
                    {loadingSelections ? (
                      <option disabled>Loading items...</option>
                    ) : InventoryItems.length === 0 ? (
                      <option disabled>No items available</option>
                    ) : (
                      InventoryItems
                        .map(item => (
                          <option key={item._id} value={item.sparePartsId || item._id}>
                            {item.itemName} ({item.sparePartsId})
                          </option>
                        ))
                    )}
                  </select>

                </div>
                <div>
                  <label className={labelCls}>Invoice (File or URL)</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className={iCls}
                      accept="application/pdf,image/*"
                      disabled={effectivelyReadOnly}
                    />
                    <input
                      type="text"
                      value={formData.invoicesUrl}
                      onChange={(e) => setFormData({ ...formData, invoicesUrl: e.target.value })}
                      className={iCls}
                      placeholder="Or enter URL if hosted externally..."
                      disabled={effectivelyReadOnly}
                    />
                  </div>
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
                  disabled={effectivelyReadOnly}
                />
              </div>

              {/* Modal Footer / Actions */}
              <div className="pt-4 mt-2 border-t border-[hsl(var(--border))] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  {effectivelyReadOnly ? 'Close' : 'Cancel'}
                </button>
                {effectivelyReadOnly ? (
                  <button
                    type="button"
                    key="btn-edit" onClick={(e) => { e.preventDefault(); setInternalPreviewMode(false); }}
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
                  >
                    Edit Expense
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="protect-mount px-5 py-2.5 text-sm font-medium rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isAdding ? 'Adding...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        {isAdding ? 'Add Expense' : 'Save Changes'}
                      </>
                    )}
                  </button>
                )}
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
  amount: number | string;
  paymentMethod: string;
  paidBy: string;
  employeeId?: string;
  notes: string;
};

const initialFormData: ExpenseFormData = {
  sparePartsId: '',
  expenseId: '',
  expenseDate: '',
  expenseType: '',
  invoicesUrl: '',
  description: '',
  amount: '',
  paymentMethod: 'Cash',
  paidBy: '',
  employeeId: '',
  notes: ''
};



