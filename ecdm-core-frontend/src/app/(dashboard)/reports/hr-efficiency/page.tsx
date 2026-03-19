"use client";

import { Pagination } from '@/components/shared/Pagination';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import { BarChart3, FileSpreadsheet, Loader2, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface HREfficiencyRow {
  recruitmentRate: string;
  attendanceRate: string;
  trainingRate: string;
  satisfactionRate: string;
  hrEfficiency: string;
  no: string;
  employee: string;
  strengths: string;
  weaknesses: string;
  actionPlan: string;
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

export default function HREfficiencyReport() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reportData, setReportData] = useState<HREfficiencyRow[]>([]);
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
      const [usersRes] = await Promise.all([
        api.get('/auth/users?limit=1000').catch(() => ({ data: [] }))
      ]);

      const users = universalExtract(usersRes.data || usersRes);

      const rows: HREfficiencyRow[] = users.map((user: any, index: number) => {
        return {
          recruitmentRate: String(user.recruitmentRate || user.numberOfVacancies || '100%'),
          attendanceRate: String(user.attendanceRate || '95%'),
          trainingRate: String(user.trainingRate || '85%'),
          satisfactionRate: String(user.satisfactionRate || '90%'),
          hrEfficiency: String(user.hrEfficiency || 'High'),
          no: String(index + 1),
          employee: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.name || user.email || 'Unknown Employee'),
          strengths: String(user.strengths || '-'),
          weaknesses: String(user.weaknesses || '-'),
          actionPlan: String(user.actionPlan || '-'),
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
      row.employee.toLowerCase().includes(q) ||
      row.strengths.toLowerCase().includes(q) ||
      row.weaknesses.toLowerCase().includes(q) ||
      row.actionPlan.toLowerCase().includes(q) ||
      row.notes.toLowerCase().includes(q)
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
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">HR Efficiency Evaluation</h1>
              <p className="text-sm text-muted-foreground">
                Evaluation of HR team performance metrics
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
                    <th className="border-b px-3 py-2 text-left font-medium">Recruitment Rate</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Attendance Rate</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Training Rate</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Satisfaction Rate</th>
                    <th className="border-b px-3 py-2 text-left font-medium">HR Efficiency</th>
                    <th className="border-b px-3 py-2 text-left font-medium bg-green-50">no.</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Employee</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Strengths</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Weaknesses</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Action Plan</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="border-b px-3 py-8 text-center text-muted-foreground">
                        {searchTerm ? 'No employees match your search' : 'No HR efficiency data found'}
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((row) => (
                      <tr key={row.no} className="hover:bg-muted/50">
                        <td className="border-b px-3 py-2">{row.recruitmentRate}</td>
                        <td className="border-b px-3 py-2">{row.attendanceRate}</td>
                        <td className="border-b px-3 py-2">{row.trainingRate}</td>
                        <td className="border-b px-3 py-2">{row.satisfactionRate}</td>
                        <td className="border-b px-3 py-2">{row.hrEfficiency}</td>
                        <td className="border-b px-3 py-2 text-center bg-green-50">{row.no}</td>
                        <td className="border-b px-3 py-2 font-medium">{row.employee}</td>
                        <td className="border-b px-3 py-2">{row.strengths}</td>
                        <td className="border-b px-3 py-2">{row.weaknesses}</td>
                        <td className="border-b px-3 py-2">{row.actionPlan}</td>
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