"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, ShieldAlert, Loader2, Search, Sheet } from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuth';
import { Pagination } from '@/components/shared/Pagination';
import api from '@/lib/axios';

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

const parseMoney = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const formatMoney = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? 'EGP 0.00' : `EGP ${num.toFixed(2)}`;
};

// ── Types ───────────────────────────────────────────────────────────
interface ReportRow {
  campaignId: string;
  campaignName: string;
  budgetAllocated: number;
  budgetUsed: number;
  leadsGenerated: number;
  leadsConverted: number;
  convRate: string;
  creator: string;
  revenue: number;
  roas: string;
  notes: string;
}

export default function MarketingReport() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    if (!user) return;
    const role = user.role;
    if (role !== 'Admin' && role !== 'SuperAdmin') {
      router.push('/dashboard');
      return;
    }

    async function fetchReport() {
      try {
        const [campaignsRes, usersRes, leadsRes] = await Promise.all([
          api.get('/marketing/campaigns').catch(() => ({ data: { data: [] } }) as any),
          api.get('/auth/users?limit=1000').catch(() => ({ data: { data: [] } }) as any),
          api.get('/marketing/leads?limit=5000').catch(() => ({ data: { data: [] } }) as any),
        ]);

        const campaigns = universalExtract(campaignsRes.data || campaignsRes, 'campaigns');
        const users = universalExtract(usersRes.data || usersRes, 'users');
        const leads = universalExtract(leadsRes.data || leadsRes, 'data');

        if (campaigns.length === 0) {
          setApiError('No campaigns found in the database.');
        }

        // Build a user look-up map by _id / id
        const userMap = new Map<string, any>();
        users.forEach((u: any) => {
          const uid = String(u._id || u.id);
          userMap.set(uid, u);
        });

        // Count leads per campaign
        const leadsPerCampaign = new Map<string, number>();
        leads.forEach((l: any) => {
          const cId = String(l.campaign?._id || l.campaign || '');
          if (cId) leadsPerCampaign.set(cId, (leadsPerCampaign.get(cId) || 0) + 1);
        });

        const rows: ReportRow[] = campaigns.map((c: any) => {
          const cId = String(c._id || c.id);
          const creatorId = String(c.createdBy?._id || c.createdBy || '');
          const creatorUser = userMap.get(creatorId);

          const budgetAllocated = parseMoney(creatorUser?.targetBudget);
          const budgetUsed = parseMoney(c.adSpend);
          const impressions = parseMoney(c.impressions);
          const leadsFromDB = leadsPerCampaign.get(cId) || 0;
          const leadsGenerated = leadsFromDB > 0 ? leadsFromDB : impressions;
          const leadsConverted = parseMoney(c.conversions);
          const convRate = leadsGenerated > 0 ? ((leadsConverted / leadsGenerated) * 100) : 0;
          const revenue = parseMoney(c.salesRevenue);
          const roas = budgetUsed > 0 ? ((revenue / budgetUsed) * 100) : 0;

          return {
            campaignId: c.campaignId || cId.substring(cId.length - 4).toUpperCase(),
            campaignName: c.campaignName || 'Unnamed Campaign',
            budgetAllocated,
            budgetUsed,
            leadsGenerated,
            leadsConverted,
            convRate: convRate.toFixed(1),
            creator: creatorUser
              ? `${creatorUser.firstName || ''} ${creatorUser.lastName || ''}`.trim()
              : 'Unknown',
            revenue,
            roas: roas.toFixed(1),
            notes: c.notes || '',
          };
        });

        setReportData(rows);
      } catch (error: any) {
        console.error('Failed to generate marketing report:', error);
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
        r.campaignName.toLowerCase().includes(q) ||
        r.creator.toLowerCase().includes(q) ||
        r.campaignId.toLowerCase().includes(q),
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
      // Re-fetch all data (simple refresh)
      const [campaignsRes, usersRes, leadsRes] = await Promise.all([
        api.get('/marketing/campaigns'),
        api.get('/auth/users?limit=1000'),
        api.get('/marketing/leads?limit=5000'),
      ]);

      const campaigns = universalExtract(campaignsRes.data || campaignsRes, 'campaigns');
      const users = universalExtract(usersRes.data || usersRes, 'users');
      const leads = universalExtract(leadsRes.data || leadsRes, 'data');

      const userMap = new Map<string, any>();
      users.forEach((u: any) => {
        const uid = String(u._id || u.id);
        userMap.set(uid, u);
      });

      const leadsPerCampaign = new Map<string, number>();
      leads.forEach((l: any) => {
        const cId = String(l.campaign?._id || l.campaign || '');
        if (cId) leadsPerCampaign.set(cId, (leadsPerCampaign.get(cId) || 0) + 1);
      });

      const rows: ReportRow[] = campaigns.map((c: any) => {
        const cId = String(c._id || c.id);
        const creatorId = String(c.createdBy?._id || c.createdBy || '');
        const creatorUser = userMap.get(creatorId);

        const budgetAllocated = parseMoney(creatorUser?.targetBudget);
        const budgetUsed = parseMoney(c.adSpend);
        const impressions = parseMoney(c.impressions);
        const leadsFromDB = leadsPerCampaign.get(cId) || 0;
        const leadsGenerated = leadsFromDB > 0 ? leadsFromDB : impressions;
        const leadsConverted = parseMoney(c.conversions);
        const convRate = leadsGenerated > 0 ? ((leadsConverted / leadsGenerated) * 100) : 0;
        const revenue = parseMoney(c.salesRevenue);
        const roas = budgetUsed > 0 ? ((revenue / budgetUsed) * 100) : 0;

        return {
          campaignId: c.campaignId || cId.substring(cId.length - 4).toUpperCase(),
          campaignName: c.campaignName || 'Unnamed Campaign',
          budgetAllocated,
          budgetUsed,
          leadsGenerated,
          leadsConverted,
          convRate: convRate.toFixed(1),
          creator: creatorUser
            ? `${creatorUser.firstName || ''} ${creatorUser.lastName || ''}`.trim()
            : 'Unknown',
          revenue,
          roas: roas.toFixed(1),
          notes: c.notes || '',
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
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  // ── Badge helpers ─────────────────────────────────────────────────
  const getRoasBadge = (roas: string) => {
    const val = parseFloat(roas);
    if (val >= 200)
      return (
        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
          {roas}%
        </span>
      );
    if (val >= 100)
      return (
        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold">
          {roas}%
        </span>
      );
    return (
      <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold">
        {roas}%
      </span>
    );
  };

  const getConvBadge = (rate: string) => {
    const val = parseFloat(rate);
    if (val >= 10)
      return (
        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
          {rate}%
        </span>
      );
    if (val >= 5)
      return (
        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
          {rate}%
        </span>
      );
    return (
      <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold">
        {rate}%
      </span>
    );
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans transition-colors duration-200">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 rounded-lg">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Marketing Evaluation Report
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Detailed performance tracking for the marketing department.
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
          placeholder="Search by campaign name, ID, or creator…"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
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
                <th className="px-6 py-4">Campaign #</th>
                <th className="px-6 py-4">Campaign Name</th>
                <th className="px-6 py-4">Budget Allocated</th>
                <th className="px-6 py-4">Budget Used</th>
                <th className="px-6 py-4">Leads Generated</th>
                <th className="px-6 py-4">Leads Converted</th>
                <th className="px-6 py-4">Conv. Rate %</th>
                <th className="px-6 py-4">Marketing Creator</th>
                <th className="px-6 py-4">Revenue</th>
                <th className="px-6 py-4">ROAS %</th>
                <th className="px-6 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {currentRows.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                    {row.campaignId}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                    {row.campaignName}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.budgetAllocated > 0
                      ? formatMoney(row.budgetAllocated)
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.budgetUsed > 0
                      ? formatMoney(row.budgetUsed)
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.leadsGenerated.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {row.leadsConverted.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">{getConvBadge(row.convRate)}</td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {row.creator}
                  </td>
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                    {row.revenue > 0
                      ? formatMoney(row.revenue)
                      : 'EGP 0.00'}
                  </td>
                  <td className="px-6 py-4">{getRoasBadge(row.roas)}</td>
                  <td className="px-6 py-4 max-w-[200px] truncate text-slate-500 dark:text-slate-400" title={row.notes}>
                    {row.notes || '-'}
                  </td>
                </tr>
              ))}
              {currentRows.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    {searchTerm
                      ? 'No campaigns match your search.'
                      : 'No marketing data available.'}
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
            itemsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}

