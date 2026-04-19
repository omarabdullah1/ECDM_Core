'use client';

import { Pagination } from '@/components/shared/Pagination';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  Banknote,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const iClsRo = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] cursor-not-allowed';
const labelCls = 'block text-sm font-medium text-[hsl(var(--foreground))] mb-1';

interface SalaryRow {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  basicSalary: string;
  allowances: string;
  overtime: string;
  bonuses: string;
  percentage: string;
  tax: string;
  insurance: string;
  absenceDeduction: string;
  otherDeductions: string;
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

const DEPARTMENTS = ['Marketing', 'R&D', 'Operation', 'HR', 'Finance', 'Customer Service', 'IT'];

const getDepartmentBadgeClass = (dept: string) => {
  switch (dept) {
    case 'Marketing':
      return 'bg-red-100 text-red-800';
    case 'R&D':
      return 'bg-red-700 text-white';
    case 'Operation':
      return 'bg-green-100 text-green-800';
    case 'HR':
      return 'bg-sky-100 text-sky-800';
    case 'Finance':
      return 'bg-purple-100 text-purple-800';
    case 'Customer Service':
      return 'bg-teal-100 text-teal-800';
    case 'IT':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatMoney = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? 'EGP 0.00' : `EGP ${num.toFixed(2)}`;
};

export default function SalariesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [salariesData, setSalariesData] = useState<SalaryRow[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<SalaryFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Employees for dropdown
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Fetch employees when modal opens
  useEffect(() => {
    if (addModalOpen) {
      setLoadingEmployees(true);
      api.get('/hr/users?limit=1000')
        .then(res => {
          const emps = res.data?.data || [];
          setEmployees(Array.isArray(emps) ? emps : []);
        })
        .catch(() => setEmployees([]))
        .finally(() => setLoadingEmployees(false));
    }
  }, [addModalOpen]);

  const fetchSalariesData = async (isSync = false) => {
    if (isSync) {
      setSyncing(true);
    } else {
      setIsLoading(true);
    }
    setApiError(null);

    try {
      const [salariesRes] = await Promise.all([
        api.get('/finance/salaries?limit=1000').catch(() => ({ data: [] }))
      ]);

      const rawSalaries = universalExtract(salariesRes.data || salariesRes);

      const rows: SalaryRow[] = rawSalaries.map((item: any) => ({
        _id: String(item._id || ''),
        employeeId: String(item.employeeId || '-'),
        employeeName: String(item.employeeName || 'Unknown'),
        department: String(item.department || '-'),
        basicSalary: formatMoney(item.basicSalary),
        allowances: formatMoney(item.allowances),
        overtime: formatMoney(item.overtime),
        bonuses: formatMoney(item.bonuses),
        percentage: String(item.percentage || '0%'),
        tax: formatMoney(item.tax),
        insurance: formatMoney(item.insurance),
        absenceDeduction: formatMoney(item.absenceDeduction),
        otherDeductions: formatMoney(item.otherDeductions),
        notes: String(item.notes || '-')
      }));

      setSalariesData(rows);
    } catch (error: any) {
      console.error('Failed to fetch salaries:', error);
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

    fetchSalariesData();
  }, [user, router]);

  const handleSync = () => {
    fetchSalariesData(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this salary record? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/finance/salaries/${id}`);
      toast.success('Salary record deleted successfully');
      fetchSalariesData(true);
    } catch (error: any) {
      console.error('Failed to delete salary:', error);
      toast.error(error.response?.data?.message || 'Failed to delete salary record');
    }
  };

  const filteredData = salariesData.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      row.employeeId.toLowerCase().includes(q) ||
      row.employeeName.toLowerCase().includes(q) ||
      row.department.toLowerCase().includes(q) ||
      row.percentage.toLowerCase().includes(q) ||
      row.notes.toLowerCase().includes(q)
    );
  });

  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.post('/finance/salaries', {
        employeeId: formData.employeeId,
        employeeName: formData.employeeName,
        department: formData.department,
        basicSalary: Number(formData.basicSalary) || 0,
        allowances: Number(formData.allowances) || 0,
        overtime: Number(formData.overtime) || 0,
        bonuses: Number(formData.bonuses) || 0,
        percentage: formData.percentage || '0%',
        tax: Number(formData.tax) || 0,
        insurance: Number(formData.insurance) || 0,
        absenceDeduction: Number(formData.absenceDeduction) || 0,
        otherDeductions: Number(formData.otherDeductions) || 0,
        notes: formData.notes || undefined
      });

      setFormData(initialFormData);
      setAddModalOpen(false);
      await fetchSalariesData(true);
    } catch (error: any) {
      console.error('Failed to add salary:', error);
      console.error('Error response:', error.response);
      const msg = error.response?.data?.message || error.message || 'Failed to add salary record';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Salaries"
        icon={Banknote}
        description="Employee payroll management"
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
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 border-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              Add Salary
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
              placeholder="Search salaries..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredData.length} record(s) found
          </span>
        </div>

        {apiError && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            {apiError}
          </div>
        )}

        {isLoading ? (
          <TableSkeleton rows={10} columns={13} height="h-12" />
        ) : (
          <>
            <div className="overflow-x-auto min-w-[1500px] rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="border-b px-3 py-2 text-left font-medium">Employee ID</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Employee Name</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Department</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Basic Salary</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Allowances</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Overtime</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Bonuses</th>
                    <th className="border-b px-3 py-2 text-left font-medium">% Percentage</th>
                    <th className="border-b px-3 py-2 text-left font-medium"># Tax</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Insurance</th>
                    <th className="border-b px-3 py-2 text-left font-medium">AbsenceDeduction</th>
                    <th className="border-b px-3 py-2 text-left font-medium">OtherDeductions</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Notes</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="border-b px-3 py-8 text-center text-muted-foreground">
                        {searchTerm ? 'No salaries match your search' : 'No salary data found'}
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((row, idx) => (
                      <tr key={`${row.employeeId}-${idx}`} className="hover:bg-muted/50">
                        <td className="border-b px-3 py-2 font-medium">{row.employeeId}</td>
                        <td className="border-b px-3 py-2">{row.employeeName}</td>
                        <td className="border-b px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getDepartmentBadgeClass(row.department)}`}>
                            {row.department}
                          </span>
                        </td>
                        <td className="border-b px-3 py-2">{row.basicSalary}</td>
                        <td className="border-b px-3 py-2">{row.allowances}</td>
                        <td className="border-b px-3 py-2">{row.overtime}</td>
                        <td className="border-b px-3 py-2">{row.bonuses}</td>
                        <td className="border-b px-3 py-2">{row.percentage}</td>
                        <td className="border-b px-3 py-2">{row.tax}</td>
                        <td className="border-b px-3 py-2">{row.insurance}</td>
                        <td className="border-b px-3 py-2">{row.absenceDeduction}</td>
                        <td className="border-b px-3 py-2">{row.otherDeductions}</td>
                        <td className="border-b px-3 py-2 text-muted-foreground">{row.notes}</td>
                        <td className="border-b px-3 py-2">
                          <button
                            onClick={() => handleDelete(row._id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="rounded-2xl border border-[hsl(var(--border))] modern-glass-card premium-shadow animate-in-slide m-auto relative shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex justify-between items-center bg-[hsl(var(--muted))]/50">
              <div>
                <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">Add New Salary</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Fill out the details below to record employee salary.</p>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors p-2 rounded-full hover:bg-[hsl(var(--muted))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitError && (
              <div className="px-6 py-4 mb-4 mx-6 mt-6 first:mt-0 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{submitError}</p>
              </div>
            )}

            <div className="p-6 overflow-y-auto">
              <form className="space-y-5" onSubmit={handleSubmit}>

                {/* Employee Selection - replaces manual Employee ID + Name inputs */}
                <div>
                  <label className={labelCls}>Employee</label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => {
                      const selected = employees.find(emp => emp._id === e.target.value);
                      if (selected) {
                        setFormData({
                          ...formData,
                          employeeId: selected._id,
                          employeeName: `${selected.firstName} ${selected.lastName}`,
                          department: selected.department || '',
                          basicSalary: selected.salary || '',
                        });
                      } else {
                        setFormData({
                          ...formData,
                          employeeId: '',
                          employeeName: '',
                          department: '',
                          basicSalary: '',
                        });
                      }
                    }}
                    className={iCls}
                    required
                  >
                    <option value="">Select Employee</option>
                    {loadingEmployees ? (
                      <option disabled>Loading employees...</option>
                    ) : employees.length === 0 ? (
                      <option disabled>No employees available</option>
                    ) : (
                      employees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} {emp.department ? `(${emp.department})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Auto-filled Department */}
                <div>
                  <label className={labelCls}>
                    Department
                    {formData.department && <span className="text-xs text-green-600 ml-2">(Auto-filled)</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    readOnly
                    className={iClsRo}
                    placeholder="Select employee to auto-fill"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>
                      Basic Salary (EGP)
                      {formData.basicSalary && <span className="text-xs text-green-600 ml-2">(Auto-filled)</span>}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.basicSalary === '' ? '' : String(formData.basicSalary)}
                      onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                      className={iClsRo}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Allowances (EGP)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.allowances === '' ? '' : String(formData.allowances)}
                      onChange={(e) => setFormData({ ...formData, allowances: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                      className={iCls}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overtime (EGP)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.overtime === '' ? '' : String(formData.overtime)}
                      onChange={(e) => setFormData({ ...formData, overtime: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                      className={iCls}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bonuses (EGP)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.bonuses === '' ? '' : String(formData.bonuses)}
                      onChange={(e) => setFormData({ ...formData, bonuses: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                      className={iCls}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Percentage (%)</label>
                    <input
                      type="text"
                      value={formData.percentage}
                      onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                      className={iCls}
                      placeholder="e.g. 5%"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax (EGP)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.tax === '' ? '' : String(formData.tax)}
                      onChange={(e) => setFormData({ ...formData, tax: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                      className={iCls}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Insurance (EGP)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.insurance === '' ? '' : String(formData.insurance)}
                      onChange={(e) => setFormData({ ...formData, insurance: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                      className={iCls}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Absence Deduction (EGP)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.absenceDeduction === '' ? '' : String(formData.absenceDeduction)}
                      onChange={(e) => setFormData({ ...formData, absenceDeduction: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                      className={iCls}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Other Deductions (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.otherDeductions === '' ? '' : String(formData.otherDeductions)}
                    onChange={(e) => setFormData({ ...formData, otherDeductions: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                    className={iCls}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`${iCls} resize-none`}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>

                <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Add Salary
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

type SalaryFormData = {
  employeeId: string;
  employeeName: string;
  department: string;
  basicSalary: number | string;
  allowances: number | string;
  overtime: number | string;
  bonuses: number | string;
  percentage: string;
  tax: number | string;
  insurance: number | string;
  absenceDeduction: number | string;
  otherDeductions: number | string;
  notes: string;
};

const initialFormData: SalaryFormData = {
  employeeId: '',
  employeeName: '',
  department: '',
  basicSalary: '',
  allowances: '',
  overtime: '',
  bonuses: '',
  percentage: '0%',
  tax: '',
  insurance: '',
  absenceDeduction: '',
  otherDeductions: '',
  notes: ''
};
