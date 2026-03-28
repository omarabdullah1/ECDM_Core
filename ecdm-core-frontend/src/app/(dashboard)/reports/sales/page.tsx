"use client";

import { Pagination } from '@/components/shared/Pagination';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import { CheckCircle2, FileSpreadsheet, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SalesReport() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Utility: Safely extract array from nested API responses
  const extractArray = (response: any): any[] => {
    if (Array.isArray(response)) return response;
    if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
    if (response?.data && Array.isArray(response.data)) return response.data;
    return [];
  };

  const formatMoney = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 'EGP 0.00' : `EGP ${num.toFixed(2)}`;
  };

  useEffect(() => {
    // Basic auth check
    if (!user) return;

    const role = user.role;
    if (role !== 'Admin' && role !== 'SuperAdmin') {
      router.push('/dashboard');
      return;
    }

    async function fetchAndCalculateReport() {
      try {
        const [usersRes, ordersRes] = await Promise.all([
          api.get('/auth/users?limit=1000').catch(() => ({ data: { data: [] } }) as any),
          api.get('/sales/orders?limit=1000').catch(() => ({ data: { data: [] } }) as any)
        ]);

        const rawUsers = usersRes.data || usersRes;
        const rawOrders = ordersRes.data || ordersRes;

        // Save raw response to debug state
        setDebugInfo({ rawUsers, rawOrders });

        // Safely extract arrays using our robust utility
        const usersList = extractArray(rawUsers);
        const validOrders = extractArray(rawOrders);

        // Filter Sales Reps Safely
        const salesReps = usersList.filter((u: any) => {
           const userRole = u?.role || '';
           return typeof userRole === 'string' && userRole.trim().toLowerCase() === 'sales';
        });

        if (salesReps.length === 0) {
          setApiError(`Found ${usersList.length} total users in the database, but 0 users matched the 'Sales' role. Please check the 'debugInfo' below to see how roles are spelled.`);
        }

        // DEBUG: Log raw Test User object to inspect actual field names
        console.log("DEBUG: Raw Test User Object:", salesReps.find((r:any) => r.email === 'user@example.com' || r.firstName === 'Test'));

        // Money parser for string values with currency symbols
        const parseMoney = (val: any): number => {
          if (!val) return 0;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[^0-9.-]+/g, "");
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        };

        // Aggregate data per sales rep
        const aggregatedData = salesReps.map((rep: any) => {
          const repId = String(rep._id || rep.id);
          const target = parseMoney(rep.targetSales);
          
          // A. Find orders using EXACT backend field name: salesPerson
          const repOrders = validOrders.filter((o: any) => {
            const spId = String(o?.salesPerson?._id || o?.salesPerson || o?.salespersonId?._id || o?.salespersonId || '');
            return spId === repId;
          });

          // B.1 WON Orders: finalStatusThirdFollowUp = 'Accepted' (counts towards actual sales)
          const wonOrders = repOrders.filter((o: any) => {
            const thirdFollowUp = String(o?.finalStatusThirdFollowUp || '').toLowerCase();
            return thirdFollowUp === 'accepted';
          });

          // B.2 TASKS COMPLETED: finalStatusThirdFollowUp = 'Accepted' OR 'Not Potential'
          const completedOrders = repOrders.filter((o: any) => {
            const thirdFollowUp = String(o?.finalStatusThirdFollowUp || '').toLowerCase();
            return thirdFollowUp === 'accepted' || thirdFollowUp === 'not potential';
          });

          // B.3 OPEN ORDERS: Orders in 1st, 2nd, or 3rd follow-up WITHOUT final decision
          // Logic: Has progressed to follow-up AND finalStatusThirdFollowUp is empty
          const openOrders = repOrders.filter((o: any) => {
            const firstFollowUp = String(o?.quotationStatusFirstFollowUp || '').trim();
            const secondFollowUp = String(o?.statusSecondFollowUp || '').trim();
            const thirdFollowUp = String(o?.finalStatusThirdFollowUp || '').trim();
            const hasFollowUp = firstFollowUp !== '' || secondFollowUp !== '' || o?.followUpThird;
            const hasFinalDecision = thirdFollowUp === 'accepted' || thirdFollowUp === 'not potential';
            return hasFollowUp && !hasFinalDecision;
          });

          // C. Sum using EXACT backend field: quotation.grandTotal
          const actualSales = wonOrders.reduce((sum: number, o: any) => {
             const grandTotal = o?.quotation?.grandTotal || 0;
             return sum + parseMoney(grandTotal);
          }, 0);
          
          // CALCULATE PERFORMANCE
          let perfScore = 0;
          if (target > 0) {
            perfScore = (actualSales / target) * 100;
          } else if (actualSales > 0) {
            perfScore = 100; 
          }
          
          // STATUS
          let repStatus = 'Low Target';
          if (perfScore >= 100 && perfScore < 120) repStatus = 'Achieved Target';
          if (perfScore >= 120) repStatus = 'Above Target';
          if (target === 0 && actualSales === 0) repStatus = 'No Target Set';

          return {
            id: rep.employeeId || (repId.substring(repId.length - 4).toUpperCase()),
            name: `${rep.firstName || 'Unknown'} ${rep.lastName || ''}`.trim(),
            jobDesc: 'Sales Executive',
            targetSales: target,
            actualSales: actualSales,
            performanceScore: perfScore.toFixed(1),
            newClients: repOrders.length,
            openOrders: openOrders.length,
            dealsClosed: wonOrders.length,
            tasksCompleted: completedOrders.length,
            feedback: '4.5',
            status: repStatus,
            hrApproved: false,
            notes: ''
          };
        });

        setReportData(aggregatedData);
      } catch (error: any) {
        console.error("Failed to generate report:", error);
        setApiError(error.message || "Unknown fetching error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAndCalculateReport();
  }, [user, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  // Security Check Fallback
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-500 bg-slate-50 dark:bg-slate-950">
        <ShieldAlert size={48} className="mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Above Target': return <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-3 py-1 rounded-full text-xs font-bold">Above Target</span>;
      case 'Achieved Target': return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">Achieved Target</span>;
      case 'Low Target': return <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold">Low Target</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans transition-colors duration-200">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-lg">
          <FileSpreadsheet size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Sales Evaluation Report</h1>
          <p className="text-slate-500 dark:text-slate-400">Automated performance tracking for the sales department.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-6 py-4">EMP ID</th>
                <th className="px-6 py-4">Employee Name</th>
                <th className="px-6 py-4">Job Desc</th>
                <th className="px-6 py-4">Target Sales</th>
                <th className="px-6 py-4">Actual Sales</th>
                <th className="px-6 py-4">Perf. Score</th>
                <th className="px-6 py-4">Clients (New)</th>
                <th className="px-6 py-4">Open Orders</th>
                <th className="px-6 py-4">Tasks Completed</th>
                <th className="px-6 py-4">Deals Closed</th>
                <th className="px-6 py-4">Feedback</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">HR Approved</th>
                <th className="px-6 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {reportData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">{row.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{row.name}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{row.jobDesc}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.targetSales > 0 ? formatMoney(row.targetSales) : '-'}
                  </td>
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                    {row.actualSales > 0 ? formatMoney(row.actualSales) : 'EGP 0.00'}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{row.performanceScore}%</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{row.newClients}</td>
                  <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-medium">{row.openOrders}</td>
                  <td className="px-6 py-4 text-green-600 dark:text-green-400 font-medium">{row.tasksCompleted}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{row.dealsClosed}</td>
                  <td className="px-6 py-4 text-amber-500 font-bold">{row.feedback} ★</td>
                  <td className="px-6 py-4">{getStatusBadge(row.status)}</td>
                  <td className="px-6 py-4">
                    {row.hrApproved ? <CheckCircle2 className="text-emerald-500" size={20}/> : <XCircle className="text-slate-300 dark:text-slate-600" size={20}/>}
                  </td>
                  <td className="px-6 py-4">
                    <input type="text" placeholder="Add note..." className="bg-transparent border-b border-slate-300 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-sm w-full" />
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No sales data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {reportData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={reportData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
