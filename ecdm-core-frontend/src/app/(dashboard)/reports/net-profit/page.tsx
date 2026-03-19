"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, ShieldAlert, Loader2, Sheet } from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuth';
import { Pagination } from '@/components/shared/Pagination';
import api from '@/lib/axios';

const universalExtract = (rawData: any): any[] => {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
  if (rawData.data?.data && Array.isArray(rawData.data.data)) return rawData.data.data;
  const possibleArray = Object.values(rawData).find(val => Array.isArray(val));
  return (possibleArray as any[]) || [];
};

interface ReportRow {
  item: string;
  salesRevenue: string;
  serviceRevenue: string;
  otherIncome: string;
  directCosts: string;
  salaries: string;
  percentage: string;
  otherExpenses: string;
  totalExpenses: string;
  totalRevenue: string;
  netProfit: string;
  notes: string;
  isNegative?: boolean;
}

const predefinedItems = [
  'Marketing Department',
  'Sales Department',
  'Operation Department',
  'HR Department',
  'Finance Department',
  'Customer Service Department',
  'IT Department',
  'R&D Department',
  'Rent',
  'Utilities'
];

export default function NetProfitReport() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const formatMoney = (val: number) => `EGP ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const generateReportData = async (isSync = false) => {
    if (isSync) setSyncing(true);
    else setIsLoading(true);
    setApiError(null);

    try {
      const [ordersRes, expensesRes, salariesRes] = await Promise.all([
        api.get('/customer/orders?limit=1000').catch(() => ({ data: [] })),
        api.get('/finance/expenses?limit=1000').catch(() => ({ data: [] })),
        api.get('/finance/salaries?limit=1000').catch(() => ({ data: [] }))
      ]);

      const orders = universalExtract(ordersRes.data || ordersRes);
      const expenses = universalExtract(expensesRes.data || expensesRes);
      const salaries = universalExtract(salariesRes.data || salariesRes);

      const rows: ReportRow[] = predefinedItems.map(item => {
        const departmentKey = item.split(' ')[0].toLowerCase();
        
        const itemSalaries = salaries.filter((s: any) => 
          String(s.department || '').toLowerCase().includes(departmentKey)
        );
        const totalSalaries = itemSalaries.reduce((sum, s) => 
          sum + (Number(s.basicSalary) || 0) + (Number(s.bonuses) || 0) + (Number(s.allowances) || 0), 0
        );

        const itemExpenses = expenses.filter((e: any) => 
          String(e.expenseType || '').toLowerCase().includes(departmentKey) ||
          String(e.description || '').toLowerCase().includes(departmentKey)
        );
        const otherExpenses = itemExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const salesRevenue = 0;
        const serviceRevenue = 0;
        const otherIncome = 0;
        const directCosts = 0;
        
        const totalRevenue = salesRevenue + serviceRevenue + otherIncome;
        const totalExpenses = directCosts + totalSalaries + otherExpenses;
        const netProfit = totalRevenue - totalExpenses;
        const percentage = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%';

        return {
          item: item,
          salesRevenue: formatMoney(salesRevenue),
          serviceRevenue: formatMoney(serviceRevenue),
          otherIncome: formatMoney(otherIncome),
          directCosts: formatMoney(directCosts),
          salaries: formatMoney(totalSalaries),
          percentage: percentage,
          otherExpenses: formatMoney(otherExpenses),
          totalExpenses: formatMoney(totalExpenses),
          totalRevenue: formatMoney(totalRevenue),
          netProfit: formatMoney(netProfit),
          notes: '-',
          isNegative: netProfit < 0
        };
      });

      setReportData(rows);
    } catch (error: any) {
      console.error('Failed to generate net profit report:', error);
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
    generateReportData();
  }, [user, router]);

  const handleSync = () => generateReportData(true);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-500 bg-slate-50 dark:bg-slate-950">
        <ShieldAlert size={48} className="mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
      </div>
    );
  }

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = reportData.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans transition-colors duration-200">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg">
            <DollarSign size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Net Profit Report
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Financial overview by department and expense category.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sheet className="h-4 w-4 text-green-600" />
          )}
          {syncing ? 'Syncing…' : 'Sync Sheet'}
        </button>
      </div>

      {apiError && (
        <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3 text-sm text-amber-800 dark:text-amber-300">
          {apiError}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto min-w-[1500px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Sales Revenue</th>
                <th className="px-6 py-4">Service Revenue</th>
                <th className="px-6 py-4">Other Income</th>
                <th className="px-6 py-4">Direct Costs</th>
                <th className="px-6 py-4">Salaries</th>
                <th className="px-6 py-4">% Percentage</th>
                <th className="px-6 py-4">Other Expenses</th>
                <th className="px-6 py-4">Total Expenses</th>
                <th className="px-6 py-4">Total Revenue</th>
                <th className="px-6 py-4"># Net Profit</th>
                <th className="px-6 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {currentRows.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                    {row.item}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.salesRevenue}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.serviceRevenue}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.otherIncome}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.directCosts}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.salaries}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.percentage === '0%' 
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        : row.isNegative
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {row.percentage}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.otherExpenses}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.totalExpenses}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.totalRevenue}
                  </td>
                  <td className={`px-6 py-4 font-bold ${
                    row.isNegative
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {row.netProfit}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {row.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reportData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={reportData.length}
            itemsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
