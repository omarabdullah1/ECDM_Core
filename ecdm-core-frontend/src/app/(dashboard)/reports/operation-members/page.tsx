"use client";

import { Pagination } from '@/components/shared/Pagination';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import { Loader2, Search, Sheet, ShieldAlert, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// ── Helpers ─────────────────────────────────────────────────────────
const universalExtract = (rawData: any, key?: string): any[] => {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  if (key && rawData.data?.[key] && Array.isArray(rawData.data[key])) return rawData.data[key];
  if (rawData.data?.data && Array.isArray(rawData.data.data)) return rawData.data.data;
  if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
  if (key && rawData[key] && Array.isArray(rawData[key])) return rawData[key];
  const potentialArray = Object.values(rawData).find(val => Array.isArray(val));
  return (potentialArray as any[]) || [];
};

// ── Types ───────────────────────────────────────────────────────────
interface ReportRow {
  employeeName: string;
  role: string;
  jobDescription: string;
  sector: string;
  typeOfOrder: string;
  punctuality: string;
  taskCompleted: number;
  taskReturned: number;
  completionRate: number;
  returnRate: number;
  taskQualityOp: string;
  taskQualityFeedback: string;
  performanceScore: number;
  hrApproved: string;
  notes: string;
}

export default function OperationMembersReport() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user) return;
    const role = user.role;
    if (role !== 'Admin' && role !== 'SuperAdmin') {
      router.push('/dashboard');
      return;
    }

    async function fetchReport() {
      try {
        const [usersRes, woRes, fbRes] = await Promise.all([
          api.get('/auth/users?limit=1000').catch(() => ({ data: [] })),
          api.get('/operations/work-orders?limit=1000').catch(() => ({ data: [] })),
          api.get('/customer/feedback?limit=1000').catch(() => ({ data: [] }))
        ]);

        const users = universalExtract(usersRes.data || usersRes, 'users');
        const workOrders = universalExtract(woRes.data || woRes);
        const feedbacks = universalExtract(fbRes.data || fbRes);

        if (users.length === 0) {
          setApiError('No users found in the database.');
        }

        // Filter operation members
        const opsMembers = users.filter((u: any) =>
          ['maintenance', 'technician', 'engineer', 'operation'].some(keyword =>
            String(u?.role || u?.jobDescription || u?.department || '').toLowerCase().includes(keyword)
          )
        );

        // Generate report data
        const rows: ReportRow[] = opsMembers.map((member: any) => {
          // 1. Find Work Orders for this member
          const memberOrders = workOrders.filter((wo: any) =>
            String(wo.assignedTo?._id || wo.assignedTo) === String(member._id) ||
            String(wo.employeeName).toLowerCase().includes(String(member.firstName || '').toLowerCase()) ||
            String(wo.technicianId) === String(member._id)
          );

          const taskCompleted = memberOrders.filter((wo: any) =>
            String(wo.status).toLowerCase() === 'completed'
          ).length;

          const taskReturned = memberOrders.filter((wo: any) =>
            String(wo.status).toLowerCase() === 'returned' ||
            String(wo.status).toLowerCase() === 'failed'
          ).length;

          const totalTasks = taskCompleted + taskReturned;

          const completionRate = totalTasks > 0 ? (taskCompleted / totalTasks) * 100 : 0;
          const returnRate = totalTasks > 0 ? (taskReturned / totalTasks) * 100 : 0;

          // 2. Find Feedback for this member's orders
          const memberFeedbacks = feedbacks.filter((fb: any) =>
            memberOrders.some((wo: any) =>
              String(wo._id || wo.id) === String(fb.orderId || fb.customerOrderId || fb.workOrderId)
            )
          );

          const avgFeedback = memberFeedbacks.length > 0
            ? memberFeedbacks.reduce((sum: number, fb: any) =>
                sum + (Number(fb.rating) || Number(fb.ratingOperation) || 0), 0
              ) / memberFeedbacks.length
            : 0;

          // 3. Return mapped object
          return {
            employeeName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown',
            role: member.role || '-',
            jobDescription: member.jobDescription || '-',
            sector: member.sector || member.department || 'Operations',
            typeOfOrder: memberOrders[0]?.typeOfOrder || memberOrders[0]?.type || 'Maintenance',
            punctuality: member.punctuality || '100%',
            taskCompleted,
            taskReturned,
            completionRate,
            returnRate,
            taskQualityOp: memberOrders[0]?.qualityScore || (completionRate > 80 ? 'High' : 'Average'),
            taskQualityFeedback: avgFeedback.toFixed(1),
            performanceScore: member.performanceScore || completionRate,
            hrApproved: member.hrApproved ? 'HR Approved' : 'Pending',
            notes: member.notes || ''
          };
        });

        setReportData(rows);
      } catch (error: any) {
        console.error('Failed to generate operation members report:', error);
        setApiError(error.message || 'Unknown fetching error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [user, router]);

  // ── Filtered data ─────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return reportData;
    const q = searchTerm.toLowerCase();
    return reportData.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.sector.toLowerCase().includes(q) ||
        r.jobDescription.toLowerCase().includes(q),
    );
  }, [reportData, searchTerm]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ── Sync handler ──────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const [usersRes, woRes, fbRes] = await Promise.all([
        api.get('/auth/users?limit=1000'),
        api.get('/operations/work-orders?limit=1000'),
        api.get('/customer/feedback?limit=1000')
      ]);

      const users = universalExtract(usersRes.data || usersRes, 'users');
      const workOrders = universalExtract(woRes.data || woRes);
      const feedbacks = universalExtract(fbRes.data || fbRes);

      const opsMembers = users.filter((u: any) =>
        ['maintenance', 'technician', 'engineer', 'operation'].some(keyword =>
          String(u?.role || u?.jobDescription || u?.department || '').toLowerCase().includes(keyword)
        )
      );

      const rows: ReportRow[] = opsMembers.map((member: any) => {
        const memberOrders = workOrders.filter((wo: any) =>
          String(wo.assignedTo?._id || wo.assignedTo) === String(member._id) ||
          String(wo.employeeName).toLowerCase().includes(String(member.firstName || '').toLowerCase()) ||
          String(wo.technicianId) === String(member._id)
        );

        const taskCompleted = memberOrders.filter((wo: any) =>
          String(wo.status).toLowerCase() === 'completed'
        ).length;

        const taskReturned = memberOrders.filter((wo: any) =>
          String(wo.status).toLowerCase() === 'returned' ||
          String(wo.status).toLowerCase() === 'failed'
        ).length;

        const totalTasks = taskCompleted + taskReturned;

        const completionRate = totalTasks > 0 ? (taskCompleted / totalTasks) * 100 : 0;
        const returnRate = totalTasks > 0 ? (taskReturned / totalTasks) * 100 : 0;

        const memberFeedbacks = feedbacks.filter((fb: any) =>
          memberOrders.some((wo: any) =>
            String(wo._id || wo.id) === String(fb.orderId || fb.customerOrderId || fb.workOrderId)
          )
        );

        const avgFeedback = memberFeedbacks.length > 0
          ? memberFeedbacks.reduce((sum: number, fb: any) =>
              sum + (Number(fb.rating) || Number(fb.ratingOperation) || 0), 0
            ) / memberFeedbacks.length
          : 0;

        return {
          employeeName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown',
          role: member.role || '-',
          jobDescription: member.jobDescription || '-',
          sector: member.sector || member.department || 'Operations',
          typeOfOrder: memberOrders[0]?.typeOfOrder || memberOrders[0]?.type || 'Maintenance',
          punctuality: member.punctuality || '100%',
          taskCompleted,
          taskReturned,
          completionRate,
          returnRate,
          taskQualityOp: memberOrders[0]?.qualityScore || (completionRate > 80 ? 'High' : 'Average'),
          taskQualityFeedback: avgFeedback.toFixed(1),
          performanceScore: member.performanceScore || completionRate,
          hrApproved: member.hrApproved ? 'HR Approved' : 'Pending',
          notes: member.notes || ''
        };
      });

      setReportData(rows);
      setApiError(null);
    } catch (error: any) {
      console.error('Sync failed:', error);
      setApiError(error.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────
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

  // ── Pagination calculation ────────────────────────────────────────
  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  // ── Badge helpers ─────────────────────────────────────────────────
  const getCompletionBadge = (rate: number) => {
    if (rate >= 80)
      return (
        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
          {rate.toFixed(1)}%
        </span>
      );
    if (rate >= 50)
      return (
        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
          {rate.toFixed(1)}%
        </span>
      );
    return (
      <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold">
        {rate.toFixed(1)}%
      </span>
    );
  };

  const getReturnBadge = (rate: number) => {
    if (rate === 0)
      return (
        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
          0%
        </span>
      );
    if (rate < 20)
      return (
        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
          {rate.toFixed(1)}%
        </span>
      );
    return (
      <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold">
        {rate.toFixed(1)}%
      </span>
    );
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans transition-colors duration-200">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Operation Members Report
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Employee evaluation report for the operations team.
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

      {/* Search bar */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, role, or sector…"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>

      {/* Error banner */}
      {apiError && (
        <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3 text-sm text-amber-800 dark:text-amber-300">
          {apiError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="w-full overflow-x-auto custom-table-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-6 py-4">Employee Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Job Description</th>
                <th className="px-6 py-4">Sector</th>
                <th className="px-6 py-4">Type of Order</th>
                <th className="px-6 py-4">Punctuality</th>
                <th className="px-6 py-4">Task Completed</th>
                <th className="px-6 py-4">Task Returned</th>
                <th className="px-6 py-4">Completion Rate %</th>
                <th className="px-6 py-4">Return Rate %</th>
                <th className="px-6 py-4">Task Quality (Op)</th>
                <th className="px-6 py-4">Task Quality (Feedback)</th>
                <th className="px-6 py-4">Performance Score</th>
                <th className="px-6 py-4">HR Approved</th>
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
                    {row.employeeName}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.role}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.jobDescription}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.sector}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.typeOfOrder}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.punctuality}
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">
                    {row.taskCompleted}
                  </td>
                  <td className="px-6 py-4 font-bold text-red-600 dark:text-red-400">
                    {row.taskReturned}
                  </td>
                  <td className="px-6 py-4">{getCompletionBadge(row.completionRate)}</td>
                  <td className="px-6 py-4">{getReturnBadge(row.returnRate)}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.taskQualityOp}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {row.taskQualityFeedback}
                  </td>
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                    {typeof row.performanceScore === 'number'
                      ? row.performanceScore.toFixed(1)
                      : row.performanceScore}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      row.hrApproved === 'HR Approved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {row.hrApproved}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-[200px] truncate text-slate-500 dark:text-slate-400" title={row.notes}>
                    {row.notes || '-'}
                  </td>
                </tr>
              ))}
              {currentRows.length === 0 && (
                <tr>
                  <td
                    colSpan={15}
                    className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    {searchTerm
                      ? 'No members match your search.'
                      : 'No operation members data available.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}

