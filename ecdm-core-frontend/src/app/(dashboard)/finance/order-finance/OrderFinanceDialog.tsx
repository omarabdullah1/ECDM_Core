'use client';

{/* 
  OrderFinanceDialog - Detailed Financial View & Invoice Generation
  Premium design with commission management for engineers, sales, and technicians.
*/}

import { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle,
  Loader2,
  User,
  Activity,
  Percent,
  Users,
  Search,
  ChevronDown
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  commissionPercentage?: number;
}

interface OrderFinanceDialogProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  readOnly?: boolean;
}
export default function OrderFinanceDialog({ 
  order, 
  isOpen, 
  onClose, 
  onSuccess,
  readOnly = false 
}: OrderFinanceDialogProps) {
  const [internalPreviewMode, setInternalPreviewMode] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const effectivelyReadOnly = readOnly || internalPreviewMode;
  const isActuallyEditing = !effectivelyReadOnly;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Derive full name helper
  const getFullName = (emp: Employee) =>
    emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';

  // Local form state
  const [formData, setFormData] = useState({
    paidAmount: order.paidAmount || 0,
    paymentMethod: order.paymentMethod || '',
    spareParts: order.spareParts || '',
    extraExpenseType: order.extraExpenseType || '',
    extraExpenseAmount: order.extraExpenseAmount || 0,
    salesPersonId: order.salesPersonId || '',
    salesPercentage: Number(order.salesPercentage) || 0,
    technicianId: order.technicianId || '',
    technicianPercentage: Number(order.techniciansPercentage) || 0,
    engineerId: order.engineerId || '',
    engineerPercentage: Number(order.engineerPercentage) || 0,
    notes: order.notes || ''
  });

  // Employee search states
  const [salesSearch, setSalesSearch] = useState(order.salesPersonName || '');
  const [techSearch, setTechSearch] = useState(order.technicianName || '');
  const [engSearch, setEngSearch] = useState(order.engineerName || '');
  const [showSalesDropdown, setShowSalesDropdown] = useState(false);
  const [showTechDropdown, setShowTechDropdown] = useState(false);
  const [showEngDropdown, setShowEngDropdown] = useState(false);

  // Fetch employees when dialog opens
  useEffect(() => {
    if (isOpen && employees.length === 0) {
      fetchEmployees();
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const { data } = await api.get('/hr/users', { params: { limit: 500 } });
      const list = data?.data?.data || data?.data || data || [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  if (!order) return null;

  // Filter helpers
  const salesEmployees = employees.filter(e =>
    ['Sales', 'Manager', 'SuperAdmin'].includes(e.role) &&
    getFullName(e).toLowerCase().includes(salesSearch.toLowerCase())
  );
  const techEmployees = employees.filter(e =>
    ['Technician', 'Maintenance', 'MaintenanceEngineer'].includes(e.role) &&
    getFullName(e).toLowerCase().includes(techSearch.toLowerCase())
  );
  const engEmployees = employees.filter(e =>
    ['MaintenanceEngineer', 'Manager', 'SuperAdmin', 'Operations'].includes(e.role) &&
    getFullName(e).toLowerCase().includes(engSearch.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Amount') || name.includes('Percentage') || name.includes('percentage') || name === 'paidAmount'
        ? Number(value)
        : value
    }));
  };

  // Select a Sales person → auto-fill commission
  const handleSelectSales = (emp: Employee) => {
    setSalesSearch(getFullName(emp));
    setShowSalesDropdown(false);
    setFormData(prev => ({
      ...prev,
      salesPersonId: emp._id,
      salesPercentage: emp.commissionPercentage ?? prev.salesPercentage,
    }));
  };

  // Select a Technician → auto-fill commission
  const handleSelectTech = (emp: Employee) => {
    setTechSearch(getFullName(emp));
    setShowTechDropdown(false);
    setFormData(prev => ({
      ...prev,
      technicianId: emp._id,
      technicianPercentage: emp.commissionPercentage ?? prev.technicianPercentage,
    }));
  };

  // Select an Engineer → auto-fill commission
  const handleSelectEng = (emp: Employee) => {
    setEngSearch(getFullName(emp));
    setShowEngDropdown(false);
    setFormData(prev => ({
      ...prev,
      engineerId: emp._id,
      engineerPercentage: emp.commissionPercentage ?? prev.engineerPercentage,
    }));
  };

  // Clear a selection
  const clearSales = () => {
    setSalesSearch('');
    setFormData(prev => ({ ...prev, salesPersonId: '', salesPercentage: 0 }));
  };
  const clearTech = () => {
    setTechSearch('');
    setFormData(prev => ({ ...prev, technicianId: '', technicianPercentage: 0 }));
  };
  const clearEng = () => {
    setEngSearch('');
    setFormData(prev => ({ ...prev, engineerId: '', engineerPercentage: 0 }));
  };

  const handleSaveFinance = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/customer/orders/${order._id}`, {
        paidAmount: formData.paidAmount,
        paymentMethod: formData.paymentMethod,
        spareParts: formData.spareParts,
        extraExpenseType: formData.extraExpenseType,
        extraExpenseAmount: formData.extraExpenseAmount,
        salesPersonId: formData.salesPersonId || null,
        salesPercentage: formData.salesPercentage,
        technicianId: formData.technicianId || null,
        technicianPercentage: formData.technicianPercentage,
        engineerId: formData.engineerId || null,
        engineerPercentage: formData.engineerPercentage,
        notes: formData.notes
      });
      
      toast.success('Finance details updated successfully');
      setInternalPreviewMode(true);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to update finance details:', error);
      toast.error(error.response?.data?.message || 'Failed to update details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setIsGenerating(true);
    try {
      await api.post('/finance/invoices/generate-invoice', {
        orderFinanceId: order._id,
        customerId: order.customer?._id || order.customerId?._id,
        amount: order.totalAmountInvoices,
        items: []
      });
      
      toast.success('Invoice generated successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Invoice generation failed:', error);
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatEGP = (amount: number) => {
    return `EGP ${amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const InfoCard = ({ label, value, icon: Icon, colorClass = "text-slate-600 dark:text-slate-300" }: any) => (
    <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 transition-all hover:shadow-md">
      <div className="flex items-center gap-3 mb-1">
        <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-bold text-slate-900 dark:text-white pl-11">
        {value}
      </div>
    </div>
  );

  const InputField = ({ label, name, type = "text", value }: any) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleInputChange}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
      />
    </div>
  );

  const SelectField = ({ label, name, value, children }: any) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">{label}</label>
      <Select
        name={name}
        value={value}
        onChange={handleInputChange}
        className="w-full font-bold"
      >
        {children}
      </Select>
    </div>
  );

  // Reusable Employee Picker component
  const EmployeePicker = ({
    label,
    searchValue,
    onSearchChange,
    showDropdown,
    onToggleDropdown,
    filteredList,
    onSelect,
    onClear,
    percentageName,
    percentageValue,
    roleTag,
    accentColor = 'blue'
  }: {
    label: string;
    searchValue: string;
    onSearchChange: (v: string) => void;
    showDropdown: boolean;
    onToggleDropdown: (v: boolean) => void;
    filteredList: Employee[];
    onSelect: (emp: Employee) => void;
    onClear: () => void;
    percentageName: string;
    percentageValue: number;
    roleTag: string;
    accentColor?: string;
  }) => {
    const colors: Record<string, string> = {
      blue:   'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300',
      violet: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-300',
      emerald:'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300',
    };
    const badgeColor = colors[accentColor] || colors.blue;

    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {roleTag}
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={e => { onSearchChange(e.target.value); onToggleDropdown(true); }}
              onFocus={() => onToggleDropdown(true)}
              onBlur={() => setTimeout(() => onToggleDropdown(false), 200)}
              placeholder={`Search ${label}...`}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-16 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchValue && (
                <button
                  type="button"
                  onClick={onClear}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>

          {/* Dropdown */}
          {showDropdown && filteredList.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
              {filteredList.slice(0, 8).map(emp => (
                <button
                  key={emp._id}
                  type="button"
                  onMouseDown={() => onSelect(emp)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors text-sm border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{getFullName(emp)}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{emp.role}</p>
                  </div>
                  {emp.commissionPercentage !== undefined && emp.commissionPercentage > 0 && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                      {emp.commissionPercentage}% commission
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Commission percentage input */}
        <div className="flex items-center gap-3">
          <Percent className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commission %</label>
            <div className="flex items-center gap-2 mt-0.5">
              <input
                type="number"
                name={percentageName}
                value={percentageValue}
                onChange={handleInputChange}
                min={0}
                max={100}
                step={0.5}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <span className="text-sm font-bold text-slate-400">%</span>
            </div>
          </div>
          {/* Commission amount preview */}
          {percentageValue > 0 && order.totalAmountInvoices > 0 && (
            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-400 uppercase">Amount</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                EGP {((order.totalAmountInvoices * percentageValue) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Commission card for view mode
  const CommissionCard = ({ label, name, percentage, amount, roleTag, colorClass }: any) => (
    <div className={`rounded-xl p-4 border ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/30 opacity-80">{roleTag}</span>
      </div>
      {name ? (
        <p className="text-sm font-bold truncate">{name}</p>
      ) : (
        <p className="text-sm italic opacity-50">Not assigned</p>
      )}
      <div className="flex items-end justify-between mt-2">
        <div className="flex items-center gap-1">
          <Percent className="w-3 h-3 opacity-60" />
          <span className="text-2xl font-black">{percentage || 0}</span>
          <span className="text-sm font-bold opacity-70">%</span>
        </div>
        {percentage > 0 && amount > 0 && (
          <p className="text-xs font-bold opacity-80">
            EGP {((amount * percentage) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Premium Header */}
        <div className="relative h-28 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center px-8 shrink-0">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                {isActuallyEditing ? 'Update Finance Details' : 'Financial Preview'}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Ref: {order.hashNumber} • {order.type}
                {effectivelyReadOnly && <span className="ml-2 text-amber-600 font-semibold">• Preview Mode</span>}
              </p>
            </div>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            {!readOnly && internalPreviewMode && (
              <button
                key="btn-edit" onClick={(e) => { e.preventDefault(); setInternalPreviewMode(false); }}
                className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 rounded-xl text-xs font-bold transition-all border border-blue-600/20"
              >
                Edit Finance
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {isActuallyEditing ? (
            /* ═══════════ EDITING MODE ═══════════ */
            <div className="space-y-6">
              {/* Financial Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField label="Paid Amount" name="paidAmount" type="number" value={formData.paidAmount} />
                <SelectField label="Payment Method" name="paymentMethod" value={formData.paymentMethod}>
                   <option value="">Select Method</option>
                   <option value="Cash">Cash</option>
                   <option value="Bank Transfer">Bank Transfer</option>
                </SelectField>
                <SelectField label="Extra Expense Type" name="extraExpenseType" value={formData.extraExpenseType}>
                   <option value="">Select Type</option>
                   <option value="Other">Other</option>
                   <option value="Transport">Transport</option>
                   <option value="Delivery">Delivery</option>
                </SelectField>
                <InputField label="Extra Expense Amount" name="extraExpenseAmount" type="number" value={formData.extraExpenseAmount} />
                <div className="md:col-span-2">
                  <InputField label="Spare Parts" name="spareParts" value={formData.spareParts} />
                </div>
              </div>

              {/* ═══ Commission Section ═══ */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-700">
                  <Percent className="w-4 h-4 text-blue-500" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Commission Settings</h4>
                  {loadingEmployees && <Loader2 className="w-3 h-3 animate-spin text-slate-400 ml-auto" />}
                </div>

                <EmployeePicker
                  label="Sales Person"
                  searchValue={salesSearch}
                  onSearchChange={setSalesSearch}
                  showDropdown={showSalesDropdown}
                  onToggleDropdown={setShowSalesDropdown}
                  filteredList={salesEmployees}
                  onSelect={handleSelectSales}
                  onClear={clearSales}
                  percentageName="salesPercentage"
                  percentageValue={formData.salesPercentage}
                  roleTag="Sales"
                  accentColor="blue"
                />

                <EmployeePicker
                  label="Technician"
                  searchValue={techSearch}
                  onSearchChange={setTechSearch}
                  showDropdown={showTechDropdown}
                  onToggleDropdown={setShowTechDropdown}
                  filteredList={techEmployees}
                  onSelect={handleSelectTech}
                  onClear={clearTech}
                  percentageName="technicianPercentage"
                  percentageValue={formData.technicianPercentage}
                  roleTag="Technician"
                  accentColor="violet"
                />

                <EmployeePicker
                  label="Engineer"
                  searchValue={engSearch}
                  onSearchChange={setEngSearch}
                  showDropdown={showEngDropdown}
                  onToggleDropdown={setShowEngDropdown}
                  filteredList={engEmployees}
                  onSelect={handleSelectEng}
                  onClear={clearEng}
                  percentageName="engineerPercentage"
                  percentageValue={formData.engineerPercentage}
                  roleTag="Engineer"
                  accentColor="emerald"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Finance Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  placeholder="Additional financial notes..."
                />
              </div>
            </div>
          ) : (
            /* ═══════════ VIEW MODE ═══════════ */
            <>
              {/* Section A: Financial Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard label="Customer" value={order.name} icon={User} colorClass="text-blue-500" />
                <InfoCard label="Total Amount" value={formatEGP(order.totalAmountInvoices)} icon={DollarSign} colorClass="text-emerald-500" />
                <InfoCard label="Direct Cost" value={formatEGP(order.cost)} icon={AlertCircle} colorClass="text-orange-500" />
                <InfoCard label="Paid Amount" value={formatEGP(order.paidAmount)} icon={DollarSign} colorClass="text-blue-600" />
                <InfoCard label="Extra Expenses" value={formatEGP(order.extraExpenseAmount)} icon={PlusCircle} colorClass="text-rose-500" />
                <InfoCard 
                  label="Net Balance" 
                  value={formatEGP(order.netBalance)} 
                  icon={CheckCircle2} 
                  colorClass={order.netBalance > 0 ? "text-red-500" : "text-emerald-500"}
                />
              </div>

              {/* Section B: Commission Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Commission Breakdown</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <CommissionCard
                    label="Sales"
                    name={order.salesPersonName}
                    percentage={order.salesPercentage}
                    amount={order.totalAmountInvoices}
                    roleTag="Sales"
                    colorClass="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200"
                  />
                  <CommissionCard
                    label="Technician"
                    name={order.technicianName}
                    percentage={order.techniciansPercentage}
                    amount={order.totalAmountInvoices}
                    roleTag="Tech"
                    colorClass="bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-200"
                  />
                  <CommissionCard
                    label="Engineer"
                    name={order.engineerName}
                    percentage={order.engineerPercentage}
                    amount={order.totalAmountInvoices}
                    roleTag="Eng"
                    colorClass="bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200"
                  />
                </div>

                {/* Total commission summary */}
                {(order.salesPercentage > 0 || order.techniciansPercentage > 0 || order.engineerPercentage > 0) && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      Total Commission Cost
                    </span>
                    <span className="text-sm font-black text-amber-800 dark:text-amber-200">
                      EGP {(
                        order.totalAmountInvoices *
                        ((Number(order.salesPercentage) + Number(order.techniciansPercentage) + Number(order.engineerPercentage)) / 100)
                      ).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      <span className="text-xs font-bold ml-1 opacity-60">
                        ({(Number(order.salesPercentage) + Number(order.techniciansPercentage) + Number(order.engineerPercentage))}%)
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Section C: Operational Metrics */}
              <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Operational Details
                </h4>
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                   <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Spare Parts</p>
                   <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                     {order.spareParts !== '-' ? order.spareParts : 'No spare parts recorded.'}
                   </p>
                </div>

                {order.invoiceId && order.invoiceId !== '-' && (
                  <div className="mt-4 p-4 rounded-xl bg-blue-600/5 border border-blue-600/10 flex items-start gap-3">
                    <Activity className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">Automated Synchronization Active</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        This order is linked to Invoice <span className="font-mono font-bold text-blue-600">{order.invoiceId}</span>. 
                        Adjusting the invoice status (Paid/Unpaid) will automatically update the <b>Paid Amount</b> and <b>Net Balance</b> shown here.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Section D: Invoice Generation */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center space-y-4 shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-md">Sales Invoice</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-center">
                      Generate a formal invoice for this order. This will create a draft invoice in the Invoices module.
                    </p>
                  </div>
                  {order.invoiceId && order.invoiceId !== '-' ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                        Invoice Generated: {order.invoiceId}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={isGenerating}
                      className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-sm"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                      Generate Invoice
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          {isActuallyEditing ? (
            <>
              <button 
                onClick={() => setInternalPreviewMode(true)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveFinance}
                disabled={isSaving}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 text-sm"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Details
              </button>
            </>
          ) : (
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

