"use client";

import { Pagination } from '@/components/shared/Pagination';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import { ClipboardCheck, FileSpreadsheet, Loader2, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface EmployeeEvaluationRow {
  id: string;
  employeeName: string;
  role: string;
  jobDescription: string;
  sector: string;
  typeOfOrder: string;
  punctuality: string;
  taskCompleted: string;
  taskReturned: string;
  completionRate: string;
  returnRate: string;
  taskQualityOp: string;
  taskQualityFeedback: string;
  performanceScore: string;
  hrApproved: string;
  reportCycle: string;
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

export default function EmployeeEvaluationReport() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reportData, setReportData] = useState<EmployeeEvaluationRow[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchReportData = async (isSync = false) => {
    if (isSync) {
      setSyncing(true);
    } else {
      setIsLoading(true);
    }
    setApiError(null);

    try {
      const [usersRes, woRes, fbRes] = await Promise.all([
        api.get('/auth/users?limit=1000').catch(() => ({ data: [] })),
        api.get('/operations/work-orders?limit=1000').catch(() => ({ data: [] })),
        api.get('/customer/feedback?limit=1000').catch(() => ({ data: [] }))
      ]);

      const users = universalExtract(usersRes.data || usersRes);
      const workOrders = universalExtract(woRes.data || woRes);
      const feedbacks = universalExtract(fbRes.data || fbRes);

      const opsUsers = users.filter((u: any) =>
        ['maintenance', 'technician', 'engineer', 'operation'].some(role =>
          String(u?.role || u?.jobDescription || '').toLowerCase().includes(role))
      );

      const rows: EmployeeEvaluationRow[] = opsUsers.map((user: any, index: number) => {
        const userId = String(user._id || user.id);
        const userOrders = workOrders.filter((wo: any) =>
          String(wo.assignedTo) === userId || String(wo.technicianId) === userId
        );

        const taskCompleted = userOrders.filter((wo: any) =>
          String(wo.status).toLowerCase() === 'completed'
        ).length;
        const taskReturned = userOrders.filter((wo: any) =>
          String(wo.status).toLowerCase() === 'returned' || String(wo.status).toLowerCase() === 'failed'
        ).length;
        const totalTasks = taskCompleted + taskReturned;

        const completionRate = totalTasks > 0 ? ((taskCompleted / totalTasks) * 100).toFixed(1) + '%' : '0%';
        const returnRate = totalTasks > 0 ? ((taskReturned / totalTasks) * 100).toFixed(1) + '%' : '0%';

        const userFeedbacks = feedbacks.filter((fb: any) =>
          userOrders.some((wo: any) => String(wo._id || wo.id) === String(fb.orderId))
        );
        const avgFeedback = userFeedbacks.length > 0
          ? (userFeedbacks.reduce((sum: number, fb: any) => sum + (Number(fb.rating) || 0), 0) / userFeedbacks.length).toFixed(1)
          : '0';

        return {
          id: String(index + 1),
          employeeName: String(user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name || 'Unknown'),
          role: String(user.role || '-'),
          jobDescription: String(user.jobDescription || '-'),
          sector: String(user.sector || user.department || 'Operations'),
          typeOfOrder: String(userOrders[0]?.type || 'Maintenance'),
          punctuality: String(user.punctuality || '100%'),
          taskCompleted: String(taskCompleted),
          taskReturned: String(taskReturned),
          completionRate: completionRate,
          returnRate: returnRate,
          taskQualityOp: String(userOrders[0]?.qualityScore || 'Average'),
          taskQualityFeedback: String(avgFeedback),
          performanceScore: completionRate,
          hrApproved: user.hrApproved ? 'HR Approved' : 'Pending',
          reportCycle: 'File',
          notes: String(user.notes || '-')
        };
      });

      setReportData(rows);
    } catch (error: any) {
      console.error('Failed to generate report:', error);
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

    fetchReportData();
  }, [user, router]);

  const handleSync = () => {
    fetchReportData(true);
  };

  const filteredData = reportData.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      row.employeeName.toLowerCase().includes(q) ||
      row.role.toLowerCase().includes(q) ||
      row.sector.toLowerCase().includes(q)
    );
  });

  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Employee Evaluation Report</h1>
              <p className="text-sm text-muted-foreground">
                Performance evaluation based on work orders and feedback
              </p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'Syncing...' : 'Sync Report'}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredData.length} employee(s) found
          </span>
        </div>

        {apiError && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            {apiError}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto min-w-[1500px] rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="border-b px-3 py-2 text-left font-medium">#</th>
                    <th className="border-b px-3 py-2 text-left font-medium">EmployeeName</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Role</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Jop Description</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Sector</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Type Of Order</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Punctuality OP Sheet</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Task Completed</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Task Returned</th>
                    <th className="border-b px-3 py-2 text-left font-medium">CompletionRate</th>
                    <th className="border-b px-3 py-2 text-left font-medium">ReturnRate</th>
                    <th className="border-b px-3 py-2 text-left font-medium"># TaskQuality OP Sheet</th>
                    <th className="border-b px-3 py-2 text-left font-medium"># TaskQuality Feedback Sheet</th>
                    <th className="border-b px-3 py-2 text-left font-medium">% PerformanceScore</th>
                    <th className="border-b px-3 py-2 text-left font-medium">HR Approved</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Report Generation Cycle 15 Days</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={17} className="border-b px-3 py-8 text-center text-muted-foreground">
                        {searchTerm ? 'No employees match your search' : 'No employee evaluation data found'}
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/50">
                        <td className="border-b px-3 py-2">{row.id}</td>
                        <td className="border-b px-3 py-2 font-medium">{row.employeeName}</td>
                        <td className="border-b px-3 py-2">{row.role}</td>
                        <td className="border-b px-3 py-2">{row.jobDescription}</td>
                        <td className="border-b px-3 py-2">{row.sector}</td>
                        <td className="border-b px-3 py-2">{row.typeOfOrder}</td>
                        <td className="border-b px-3 py-2">{row.punctuality}</td>
                        <td className="border-b px-3 py-2">{row.taskCompleted}</td>
                        <td className="border-b px-3 py-2">{row.taskReturned}</td>
                        <td className="border-b px-3 py-2">{row.completionRate}</td>
                        <td className="border-b px-3 py-2">{row.returnRate}</td>
                        <td className="border-b px-3 py-2">{row.taskQualityOp}</td>
                        <td className="border-b px-3 py-2">{row.taskQualityFeedback}</td>
                        <td className="border-b px-3 py-2 font-medium">{row.performanceScore}</td>
                        <td className="border-b px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.hrApproved === 'HR Approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {row.hrApproved}
                          </span>
                        </td>
                        <td className="border-b px-3 py-2">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        </td>
                        <td className="border-b px-3 py-2 text-muted-foreground">{row.notes}</td>
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
    </div>
  );
}
