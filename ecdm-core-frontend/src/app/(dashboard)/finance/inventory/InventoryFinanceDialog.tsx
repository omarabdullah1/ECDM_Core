'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  PlusCircle,
  Loader2,
  User,
  Activity,
  Package,
  Wrench,
  Percent,
  Users,
  Search,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  commissionPercentage?: number;
}

interface InventoryFinanceDialogProps {
  workOrder: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  readOnly?: boolean;
}

export default function InventoryFinanceDialog({ 
  workOrder: initialWorkOrder, 
  isOpen, 
  onClose, 
  onSuccess,
  readOnly = false 
}: InventoryFinanceDialogProps) {
  // Sync local state with props for immediate responsiveness
  const [internalPreviewMode, setInternalPreviewMode] = useState(true);
  const [workOrder, setWorkOrder] = useState(initialWorkOrder);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const effectivelyReadOnly = readOnly || internalPreviewMode;
  const isActuallyEditing = !effectivelyReadOnly;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const router = useRouter();

  // Local form state for editing
  const [formData, setFormData] = useState({
    engineerId: initialWorkOrder.engineerId || '',
    commissionPercentage: Number(initialWorkOrder.commissionPercentage) || 0,
  });

  const [engSearch, setEngSearch] = useState(initialWorkOrder.engineerName || '');
  const [showEngDropdown, setShowEngDropdown] = useState(false);
  
  // New: Invoice Selection States
  const [existingInvoices, setExistingInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Reset local state when props change
  useEffect(() => {
    setWorkOrder(initialWorkOrder);
    setFormData({
      engineerId: initialWorkOrder.engineerId || '',
      commissionPercentage: Number(initialWorkOrder.commissionPercentage) || 0,
    });
    setEngSearch(initialWorkOrder.engineerName || '');
    setIsUpdateMode(false);
    setSelectedInvoiceId('');
  }, [initialWorkOrder]);

  useEffect(() => {
    if (isOpen) {
      if (employees.length === 0) fetchEmployees();
      fetchCustomerInvoices();
    }
  }, [isOpen]);

  const fetchCustomerInvoices = async () => {
    const custId = workOrder.customerOrderId?.customerId?._id || workOrder.customerOrderId?.customerId;
    if (!custId) return;

    setLoadingInvoices(true);
    try {
      // Fetch only PENDING invoices for this customer
      const { data } = await api.get('/finance/invoices', { 
        params: { 
          customerId: custId, 
          status: 'Pending',
          limit: 50 
        } 
      });
      const list = data?.data?.data || data?.data || data?.items || [];
      setExistingInvoices(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch customer invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

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

  if (!workOrder) return null;

  const getFullName = (emp: Employee) =>
    emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';

  const engEmployees = employees.filter(e =>
    ['MaintenanceEngineer', 'Manager', 'SuperAdmin', 'Operations', 'Technician'].includes(e.role) &&
    getFullName(e).toLowerCase().includes(engSearch.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'commissionPercentage' ? Number(value) : value
    }));
  };

  const handleSelectEng = (emp: Employee) => {
    setEngSearch(getFullName(emp));
    setShowEngDropdown(false);
    setFormData(prev => ({
      ...prev,
      engineerId: emp._id,
      commissionPercentage: emp.commissionPercentage ?? prev.commissionPercentage,
    }));
  };

  const clearEng = () => {
    setEngSearch('');
    setFormData(prev => ({ ...prev, engineerId: '', commissionPercentage: 0 }));
  };

  const handleSaveFinance = async () => {
    setIsSaving(true);
    try {
      await api.put(`/finance/inventory/${workOrder._id}`, {
        engineerId: formData.engineerId || null,
        commissionPercentage: formData.commissionPercentage,
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
      const payload = isUpdateMode && selectedInvoiceId ? { targetInvoiceId: selectedInvoiceId } : {};
      const response = await api.post(`/finance/inventory/generate-invoice/${workOrder._id}`, payload);
      const result = response.data?.data || response.data;
      
      // Update local state immediately with the new invoice number
      if (result.invoiceNumber) {
        setWorkOrder((prev: any) => ({
          ...prev,
          invoiceId: result.invoiceNumber,
          invoiceStatus: 'Pending'
        }));
      }

      toast.success(isUpdateMode ? 'Spare parts added to existing invoice!' : 'New invoice generated successfully!');
      if (!isUpdateMode) setIsUpdateMode(false);
      onSuccess(); // Also refresh the main table in background
    } catch (error: any) {
      console.error('Invoice generation failed:', error);
      toast.error(error.response?.data?.message || 'Failed to process invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewInvoice = () => {
    router.push('/finance/invoices');
  };

  const formatEGP = (amount: number) => {
    return `EGP ${amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ── Reusable Component: InfoCard (Standard View) ───────────────────────────
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

  // ── Reusable Component: CommissionCard (Standard View) ──────────────────────
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
        {/* Premium Header - Matching Order Finance */}
        <div className="relative h-28 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center px-8 shrink-0">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              {workOrder.invoiceId ? <FileText className="w-7 h-7 text-white" /> : <Package className="w-7 h-7 text-white" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                {isActuallyEditing ? 'Update Finance Details' : 'Financial Preview'}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {workOrder.invoiceId ? `Invoice: ${workOrder.invoiceId}` : `Ref: ${workOrder.sparePartsId}`} • {workOrder.itemName}
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
               {/* Commission Section - Focused on assigned Engineer */}
               <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-700">
                  <Percent className="w-4 h-4 text-blue-500" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Engineer Commission</h4>
                  {loadingEmployees && <Loader2 className="w-3 h-3 animate-spin text-slate-400 ml-auto" />}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/20">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Maintenance Engineer</span>
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300">
                      Eng
                    </span>
                  </div>

                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={engSearch}
                        onChange={e => { setEngSearch(e.target.value); setShowEngDropdown(true); }}
                        onFocus={() => setShowEngDropdown(true)}
                        onBlur={() => setTimeout(() => setShowEngDropdown(false), 200)}
                        placeholder="Search Engineer..."
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-16 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                      <div className="absolute right-2 flex items-center gap-1">
                        {engSearch && (
                          <button type="button" onClick={clearEng} className="p-1 text-slate-400 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>

                    {showEngDropdown && engEmployees.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                        {engEmployees.map(emp => (
                          <button
                            key={emp._id}
                            type="button"
                            onMouseDown={() => handleSelectEng(emp)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors text-sm border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                          >
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-200">{getFullName(emp)}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{emp.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Percent className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commission %</label>
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          type="number"
                          name="commissionPercentage"
                          value={formData.commissionPercentage}
                          onChange={handleInputChange}
                          min={0}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        <span className="text-sm font-bold text-slate-400">%</span>
                      </div>
                    </div>
                    {formData.commissionPercentage > 0 && workOrder.price > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-400 uppercase">Amount</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {formatEGP((workOrder.price * formData.commissionPercentage) / 100)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ═══════════ VIEW MODE ═══════════ */
            <>
              {/* Financial Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard label="Customer" value={workOrder.customerName} icon={User} colorClass="text-blue-500" />
                <InfoCard label="Total Amount" value={formatEGP(workOrder.price)} icon={DollarSign} colorClass="text-emerald-500" />
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <InfoCard 
                    label="Paid Amount" 
                    value={formatEGP(workOrder.paidAmount || 0)} 
                    icon={CheckCircle2} 
                    colorClass="text-blue-600" 
                  />
                  <InfoCard 
                    label="Remaining Balance" 
                    value={formatEGP(Math.max(0, (workOrder.price || 0) - (workOrder.paidAmount || 0)))} 
                    icon={AlertCircle} 
                    colorClass={(workOrder.price - (workOrder.paidAmount || 0)) > 0 ? "text-rose-500" : "text-emerald-500"} 
                  />
                </div>
                <InfoCard label="Items Used" value={workOrder.stockNumber} icon={Package} colorClass="text-orange-500" />
                <InfoCard 
                  label="Invoice Status" 
                  value={workOrder.invoiceStatus || 'Pending'} 
                  icon={FileText} 
                  colorClass={workOrder.invoiceStatus === 'Paid' ? "text-emerald-500" : "text-amber-500"}
                />
              </div>

              {/* Commission Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Commission Breakdown</h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <CommissionCard
                    label="Engineer"
                    name={workOrder.engineerName}
                    percentage={workOrder.commissionPercentage}
                    amount={workOrder.price}
                    roleTag="Eng"
                    colorClass="bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200"
                  />
                </div>
              </div>

              {/* Operational Details (Parts) */}
              <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Operational Details
                </h4>
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Parts Used</p>
                  {workOrder.partsUsed?.length > 0 ? (
                    <div className="space-y-2">
                      {workOrder.partsUsed.map((part: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0 shadow-sm px-2 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            {part.priceListId?.itemName || 'Item'} (x{part.quantity})
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{formatEGP(part.quantity * (part.unitCost || 0))}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No parts recorded.</p>
                  )}
                </div>
              </div>

              {/* Invoice Generation - Matching Order Finance Theme */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center space-y-4 shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-md">Inventory Invoice</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-center">
                      Generate a formal invoice for these spare parts. This will create or update a draft invoice in the Invoices module.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-4 w-full">
                    {/* Invoice Mode Toggle */}
                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit mx-auto border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => setIsUpdateMode(false)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${!isUpdateMode ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}
                      >
                        New Invoice
                      </button>
                      <button
                        onClick={() => setIsUpdateMode(true)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${isUpdateMode ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}
                      >
                        Update Existing
                      </button>
                    </div>

                    {/* Target Invoice Selection (Conditional) */}
                    {isUpdateMode && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Select Customer Invoice</label>
                        <div className="relative">
                          <select
                            value={selectedInvoiceId}
                            onChange={(e) => setSelectedInvoiceId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all pr-10"
                          >
                            <option value="">Choose an invoice...</option>
                            {existingInvoices.map(inv => (
                              <option key={inv._id} value={inv._id}>
                                {inv.invoiceNumber} • EGP {inv.grandTotal?.toLocaleString()}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        {existingInvoices.length === 0 && !loadingInvoices && (
                          <p className="text-[10px] text-amber-500 font-bold text-center">No pending invoices found for this customer.</p>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleGenerateInvoice}
                      disabled={isGenerating || (isUpdateMode && !selectedInvoiceId)}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-sm"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                      {isUpdateMode ? 'Add to Selected Invoice' : 'Generate New Invoice'}
                    </button>

                    {workOrder.invoiceId && (
                      <div className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Current Linked Invoice: <span className="font-mono text-blue-600">{workOrder.invoiceId}</span>
                        </span>
                        <button 
                          onClick={handleViewInvoice}
                          className="ml-2 text-[10px] text-blue-500 hover:underline font-bold uppercase"
                        >
                          View in List
                        </button>
                      </div>
                    )}
                  </div>
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
