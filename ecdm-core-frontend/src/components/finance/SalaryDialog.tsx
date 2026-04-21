'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { 
  X, 
  Loader2, 
  UserPlus
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter 
} from '@/components/ui/dialog';

const iCls = 'flex h-10 w-full rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 dark:bg-slate-950';
const iClsRo = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 px-4 py-2.5 text-sm text-[hsl(var(--muted-foreground))] cursor-not-allowed';
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5';

export interface SalaryFormData {
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
  month: number;
  year: number;
  notes: string;
}

interface SalaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedSalary?: any; // If editing
  prefillEmployeeId?: string; // If adding for specific employee
  initialMonth?: string | number;
  initialYear?: string | number;
}

const initialFormData: SalaryFormData = {
  employeeId: '',
  employeeName: '',
  department: '',
  basicSalary: '',
  allowances: 0,
  overtime: 0,
  bonuses: 0,
  percentage: '0%',
  tax: 0,
  insurance: 0,
  absenceDeduction: 0,
  otherDeductions: 0,
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  notes: ''
};

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

export default function SalaryDialog({ isOpen, onClose, onSuccess, selectedSalary, prefillEmployeeId, initialMonth, initialYear }: SalaryDialogProps) {
  const [formData, setFormData] = useState<SalaryFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [internalPreviewMode, setInternalPreviewMode] = useState(true);
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const isAdding = !selectedSalary;
  const effectivelyReadOnly = !isAdding && internalPreviewMode;

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      if (selectedSalary) {
        const raw = selectedSalary._raw || selectedSalary;
        setFormData({
          employeeId: raw.employeeId?._id || raw.employeeId || '',
          employeeName: raw.employeeName || '',
          department: raw.department || '',
          basicSalary: raw.basicSalary || '',
          allowances: raw.allowances || 0,
          overtime: raw.overtime || 0,
          bonuses: raw.bonuses || 0,
          percentage: raw.percentage || '0%',
          tax: raw.tax || 0,
          insurance: raw.insurance || 0,
          absenceDeduction: raw.absenceDeduction || 0,
          otherDeductions: raw.otherDeductions || 0,
          month: raw.month || new Date().getMonth() + 1,
          year: raw.year || new Date().getFullYear(),
          notes: raw.notes || ''
        });
        setInternalPreviewMode(true);
      } else {
        setFormData({
            ...initialFormData,
            employeeId: prefillEmployeeId || '',
            month: Number(initialMonth) || new Date().getMonth() + 1,
            year: Number(initialYear) || new Date().getFullYear(),
        });
        setInternalPreviewMode(false);
      }
    }
  }, [isOpen, selectedSalary, prefillEmployeeId]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await api.get('/hr/users?limit=1000');
      const emps = res.data?.data?.data || res.data?.data || res.data || [];
      setEmployees(Array.isArray(emps) ? emps : []);
      
      // If we have a prefill ID, let's trigger the auto-fill logic
      if (prefillEmployeeId && Array.isArray(emps)) {
        const selected = emps.find(emp => emp._id === prefillEmployeeId);
        if (selected) {
           setFormData(prev => ({
             ...prev,
             employeeId: selected._id,
             employeeName: `${selected.firstName} ${selected.lastName}`,
             department: selected.department || '',
             basicSalary: selected.salary || '',
           }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleEmployeeChange = (empId: string) => {
    const selected = employees.find(emp => emp._id === empId);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        ...formData,
        basicSalary: Number(formData.basicSalary) || 0,
        allowances: Number(formData.allowances) || 0,
        overtime: Number(formData.overtime) || 0,
        bonuses: Number(formData.bonuses) || 0,
        tax: Number(formData.tax) || 0,
        insurance: Number(formData.insurance) || 0,
        absenceDeduction: Number(formData.absenceDeduction) || 0,
        otherDeductions: Number(formData.otherDeductions) || 0,
        month: Number(formData.month),
        year: Number(formData.year),
      };

      if (isAdding) {
        await api.post('/finance/salaries', payload);
        toast.success('Salary record added successfully');
      } else {
        await api.put(`/finance/salaries/${selectedSalary._id}`, payload);
        toast.success('Salary record updated successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save salary:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to save salary record';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex justify-between items-center w-full">
            <div>
              <DialogTitle className="text-xl font-bold">
                {isAdding ? 'Add Monthly Salary' : (effectivelyReadOnly ? 'Salary Preview' : 'Edit Salary')}
              </DialogTitle>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {isAdding ? 'Record salary details for a specific month.' : (effectivelyReadOnly ? 'Viewing record in read-only mode.' : 'Modify salary details below.')}
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="p-6 overflow-y-auto">
          {submitError && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
              {submitError}
            </div>
          )}

          <form id="salary-form" className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Selection */}
              <div>
                <label className={labelCls}>Employee</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className={iCls}
                  required
                  disabled={effectivelyReadOnly || !isAdding || !!prefillEmployeeId}
                >
                  <option value="">Select Employee</option>
                  {loadingEmployees ? (
                    <option disabled>Loading employees...</option>
                  ) : (
                    employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} {emp.department ? `(${emp.department})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className={labelCls}>Department</label>
                <input
                  type="text"
                  value={formData.department}
                  readOnly
                  className={iClsRo}
                  placeholder="Auto-filled"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Month */}
              <div>
                <label className={labelCls}>Month</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                  className={iCls}
                  disabled={effectivelyReadOnly}
                  required
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className={labelCls}>Year</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  className={iCls}
                  disabled={effectivelyReadOnly}
                  required
                >
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[hsl(var(--border))] border-dashed">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Salary Figures
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Basic Salary (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                    className={iClsRo}
                    readOnly
                  />
                </div>
                <div>
                  <label className={labelCls}>Allowances (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.allowances}
                    onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                    className={iCls}
                    disabled={effectivelyReadOnly}
                  />
                </div>
                <div>
                  <label className={labelCls}>Overtime (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.overtime}
                    onChange={(e) => setFormData({ ...formData, overtime: e.target.value })}
                    className={iCls}
                    disabled={effectivelyReadOnly}
                  />
                </div>
                <div>
                  <label className={labelCls}>Bonuses (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.bonuses}
                    onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })}
                    className={iCls}
                    disabled={effectivelyReadOnly}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[hsl(var(--border))] border-dashed">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Deductions & Tax
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Tax (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    className={iCls}
                    disabled={effectivelyReadOnly}
                  />
                </div>
                <div>
                  <label className={labelCls}>Insurance (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.insurance}
                    onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                    className={iCls}
                    disabled={effectivelyReadOnly}
                  />
                </div>
                <div>
                  <label className={labelCls}>Absence Deduction (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.absenceDeduction}
                    onChange={(e) => setFormData({ ...formData, absenceDeduction: e.target.value })}
                    className={iCls}
                    disabled={effectivelyReadOnly}
                  />
                </div>
                <div>
                  <label className={labelCls}>Other Deductions (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.otherDeductions}
                    onChange={(e) => setFormData({ ...formData, otherDeductions: e.target.value })}
                    className={iCls}
                    disabled={effectivelyReadOnly}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={`${iCls} h-24 resize-none py-2`}
                placeholder="Additional details..."
                disabled={effectivelyReadOnly}
              />
            </div>
          </form>
        </DialogBody>

        <DialogFooter className="px-6 py-4 bg-[hsl(var(--muted))]/30 border-t border-[hsl(var(--border))]">
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))] transition-colors"
            >
              {effectivelyReadOnly ? 'Close' : 'Cancel'}
            </button>
            {effectivelyReadOnly ? (
              <button
                type="button"
                onClick={() => setInternalPreviewMode(false)}
                className="flex-1 rounded-xl bg-blue-600 text-white py-2.5 text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                Edit Record
              </button>
            ) : (
              <button
                type="submit"
                form="salary-form"
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[hsl(var(--primary))] text-white py-2.5 text-sm font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isAdding ? (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add Salary
                  </>
                ) : 'Save Changes'}
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
