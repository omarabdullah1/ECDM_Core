'use client';

{/* 
  OrderFinanceDialog - Detailed Financial View & Invoice Generation
  Premium design with glassmorphism and clear status indicators.
*/}

import { useState } from 'react';
import { 
  X, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle,
  Loader2,
  User,
  Activity
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

interface OrderFinanceDialogProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderFinanceDialog({ 
  order, 
  isOpen, 
  onClose, 
  onSuccess 
}: OrderFinanceDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local form state for finance details
  const [formData, setFormData] = useState({
    paidAmount: order.paidAmount || 0,
    paymentMethod: order.paymentMethod || '',
    spareParts: order.spareParts || '',
    extraExpenseType: order.extraExpenseType || '',
    extraExpenseAmount: order.extraExpenseAmount || 0,
    salesPercentage: order.salesPercentage || '0%',
    technicianPercentage: order.techniciansPercentage || '0%',
    engineerPercentage: order.engineerPercentage || '0%',
    notes: order.notes || ''
  });

  if (!order) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Amount') ? Number(value) : value
    }));
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
        salesPercentage: formData.salesPercentage,
        technicianPercentage: formData.technicianPercentage,
        engineerPercentage: formData.engineerPercentage,
        notes: formData.notes
      });
      
      toast.success('Finance details updated successfully');
      setIsEditing(false);
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
        items: [] // Backend handles mapping from quotation
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
                {isEditing ? 'Update Finance Details' : 'Order Finance Details'}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Ref: {order.hashNumber} • {order.type}
              </p>
            </div>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
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
          {isEditing ? (
            /* Editing Mode */
            <div className="space-y-6">
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
                <InputField label="Sales Commission %" name="salesPercentage" value={formData.salesPercentage} />
                <InputField label="Tech Commission %" name="technicianPercentage" value={formData.technicianPercentage} />
                <InputField label="Engineer Commission %" name="engineerPercentage" value={formData.engineerPercentage} />
                <InputField label="Spare Parts" name="spareParts" value={formData.spareParts} />
              </div>
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
            /* View Mode */
            <>
              {/* Section A: Read-Only Context */}
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

              {/* Section B: Finance Breakdown */}
              <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Operational Metrics
                </h4>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Sales %</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{order.salesPercentage}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Tech %</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{order.techniciansPercentage}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Eng %</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{order.engineerPercentage}</p>
                  </div>
                </div>
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

              {/* Section C: Invoice Generation */}
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
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)}
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
