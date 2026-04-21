'use client';
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calculator, 
  Wallet,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import DataTable from '@/components/ui/DataTable';
import { columns, SalaryRow } from './columns';
import SalaryDialog from '@/components/finance/SalaryDialog';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

export default function SalariesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  
  // State
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [searchTerm, setSearchTerm] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const universalExtract = (rawData: any): any[] => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
    if (rawData.data?.data && Array.isArray(rawData.data.data)) return rawData.data.data;
    const possibleArray = Object.values(rawData).find(val => Array.isArray(val));
    return (possibleArray as any[]) || [];
  };

  const formatMoney = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 'EGP 0.00' : `EGP ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchSalariesData = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setApiError(null);

    try {
      const res = await api.get('/finance/salaries', {
          params: {
              limit: 1000,
              month: selectedMonth,
              year: selectedYear
          }
      });

      const rawSalaries = universalExtract(res.data);

      const rows: SalaryRow[] = rawSalaries.map((item: any) => ({
        _id: String(item._id || ''),
        employeeId: String(item.employeeId?.employeeId || item.employeeId || '-'),
        employeeName: String(item.employeeName || 'Unknown'),
        department: String(item.department || '-'),
        basicSalary: formatMoney(item.basicSalary),
        allowances: formatMoney(item.allowances),
        overtime: formatMoney(item.overtime),
        bonuses: formatMoney(item.bonuses),
        percentage: item.percentage || '0%',
        tax: formatMoney(item.tax),
        insurance: formatMoney(item.insurance),
        absenceDeduction: formatMoney(item.absenceDeduction),
        otherDeductions: formatMoney(item.otherDeductions),
        notes: item.notes || '',
      }));

      setSalaries(rows);
    } catch (error: any) {
      console.error('Failed to fetch salaries:', error);
      const msg = error.code === 'ERR_NETWORK' 
        ? 'Backend Connection Error. Please verify the server is running.' 
        : (error.response?.data?.message || 'Failed to load records.');
      setApiError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const role = user.role;
    if (role !== 'Admin' && role !== 'SuperAdmin' && role !== 'HR') {
      router.push('/dashboard');
      return;
    }

    fetchSalariesData();
  }, [user, router, selectedMonth, selectedYear]);

  const handleGenerate = async () => {
    if (!confirm(`Process and sync salaries for ${months[Number(selectedMonth) - 1]} ${selectedYear}? This will update existing records with the latest basic salaries and attendance data.`)) return;
    
    setGenerating(true);
    try {
      const res = await api.post('/finance/salaries/generate/monthly', {
          month: selectedMonth,
          year: selectedYear
      });
      
      const result = res.data.data;
      const { generated, updated, failed, errors } = result;
      
      if (generated > 0 || updated > 0) {
        toast.success(`Success: ${generated} new records and ${updated} updated records.`);
      } else if (failed > 0) {
        const firstError = errors && errors[0] ? errors[0] : '';
        toast.error(`Processing Error: ${firstError || 'Check system logs.'}`);
      } else {
        toast.error('No active employees found to process.');
      }

      fetchSalariesData(true);
    } catch (error: any) {
      console.error('Failed to generate salaries:', error);
      toast.error(error.response?.data?.message || 'Payroll generation failed. Check network connection.');
    } finally {
      setGenerating(false);
    }
  };

  const filteredSalaries = salaries.filter(s => 
    s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
            <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Salaries</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Payroll management for {months[Number(selectedMonth) - 1]} {selectedYear}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating || isLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            {generating ? 'Processing...' : 'Process & Sync Month'}
          </button>

          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-lg shadow-black/10 dark:shadow-white/10 hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Manual Record
          </button>
        </div>
      </div>

      {/* Filters & Seaarch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="lg:col-span-6 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search employees, IDs or departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        <div className="lg:col-span-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all font-bold"
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all font-bold"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-1 text-center font-mono text-xs text-slate-400 font-bold">
          {filteredSalaries.length} Records
        </div>
      </div>

      {/* Data Table */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-0 group-hover:opacity-10 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden min-h-[400px]">
          {apiError ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Data</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">{apiError}</p>
              <button 
                onClick={() => fetchSalariesData()} 
                className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform"
              >
                Try Again
              </button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredSalaries}
              loading={isLoading}
              key={salaries.length} // Force re-render when count changes
              emptyMessage="No salary records found for this period"
            />
          )}
        </div>
      </div>

      {/* Manual Add Dialog */}
      <SalaryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          setIsDialogOpen(false);
          fetchSalariesData(true);
        }}
        initialMonth={selectedMonth}
        initialYear={selectedYear}
      />
    </div>
  );
}
