'use client';
import { useState, useCallback } from 'react';
import { Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuth';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

/**
 * Shared DataTable component with RBAC-protected bulk delete functionality.
 * 
 * The "Delete Selected" button is ONLY visible to SuperAdmin or Manager roles.
 * This provides a consistent, secure pattern across all data tables in the system.
 * 
 * @example
 * // Using bulkDeleteEndpoint (recommended for standard API endpoints):
 * <DataTable 
 *   data={leads} 
 *   columns={columns}
 *   bulkDeleteEndpoint="/api/sales/leads/bulk-delete"
 *   onBulkDeleteSuccess={() => refetch()}
 * />
 * 
 * @example
 * // Using custom onBulkDelete callback (for complex delete logic):
 * <DataTable 
 *   data={leads} 
 *   columns={columns}
 *   onBulkDelete={async (ids) => {
 *     await customDeleteLogic(ids);
 *   }}
 *   onBulkDeleteSuccess={() => refetch()}
 * />
 */

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T, meta?: any) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends { _id: string }> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  // Pagination
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  // Bulk delete - Option 1: API endpoint (recommended)
  bulkDeleteEndpoint?: string;
  // Bulk delete - Option 2: Custom callback function
  onBulkDelete?: (ids: string[]) => Promise<void>;
  // Callback after successful bulk delete
  onBulkDeleteSuccess?: () => void;
  // Single row actions
  renderActions?: (row: T) => React.ReactNode;
  // Selection disabled for entire table
  selectionDisabled?: boolean;
  // Meta object for custom handlers (e.g., onEdit, onDelete)
  meta?: any;
}

// Admin roles that can perform bulk delete
const ADMIN_ROLES = ['SuperAdmin', 'Manager'];

export function DataTable<T extends { _id: string }>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data found.',
  page = 1,
  totalPages = 1,
  onPageChange,
  bulkDeleteEndpoint,
  onBulkDelete,
  onBulkDeleteSuccess,
  renderActions,
  selectionDisabled = false,
  meta,
}: DataTableProps<T>) {
  const { user } = useAuthStore();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Check if current user has admin privileges for bulk delete
  const isAdmin = user?.role && ADMIN_ROLES.includes(user.role);
  // Can bulk delete if admin AND either endpoint or callback is provided
  const canBulkDelete = isAdmin && (bulkDeleteEndpoint || onBulkDelete) && !selectionDisabled;

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAllSelection = useCallback(() => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map(row => row._id)));
    }
  }, [data, selectedRows.size]);

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    if (!bulkDeleteEndpoint && !onBulkDelete) return;

    setDeleting(true);
    try {
      const ids = Array.from(selectedRows);
      
      // Use custom callback if provided, otherwise use the API endpoint
      if (onBulkDelete) {
        await onBulkDelete(ids);
      } else if (bulkDeleteEndpoint) {
        await api.post(bulkDeleteEndpoint, { ids });
      }
      
      toast.success(`Successfully deleted ${selectedRows.size} item(s)`);
      setSelectedRows(new Set());
      onBulkDeleteSuccess?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err.response?.data?.message || err.message || 'Failed to delete selected items');
    }
    setDeleting(false);
    setShowBulkDeleteConfirm(false);
  };

  // Clear selection when data changes (e.g., page change, refresh)
  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    clearSelection();
    onPageChange?.(newPage);
  };

  // Get cell value from row
  const getCellValue = (row: T, key: keyof T | string): unknown => {
    const keys = String(key).split('.');
    let value: unknown = row;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return value;
  };

  return (
    <div className="space-y-4">
      {/* Bulk Delete Button - ONLY visible to SuperAdmin/Manager */}
      {canBulkDelete && selectedRows.size > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkDeleteConfirm(true)}
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedRows.size})
          </button>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Admin action • This cannot be undone
          </span>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div>
        ) : (
          <table className="w-full text-sm whitespace-nowrap min-w-max">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>
                {/* Checkbox column - only show if user is admin and bulk delete is enabled */}
                {canBulkDelete && (
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={data.length > 0 && selectedRows.size === data.length}
                      onChange={toggleAllSelection}
                      className="h-4 w-4 rounded border-[hsl(var(--border))] cursor-pointer"
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    className={`px-3 py-3 text-left font-semibold text-xs uppercase tracking-wide ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
                {renderActions && (
                  <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr
                  key={row._id}
                  className={`border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20 ${
                    selectedRows.has(row._id) ? 'bg-[hsl(var(--primary))]/5' : ''
                  }`}
                >
                  {/* Checkbox cell */}
                  {canBulkDelete && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row._id)}
                        onChange={() => toggleRowSelection(row._id)}
                        className="h-4 w-4 rounded border-[hsl(var(--border))] cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={String(col.key)} className={`px-3 py-3 ${col.className || ''}`}>
                      {col.render
                        ? col.render(row, meta)
                        : String(getCellValue(row, col.key) ?? '-')}
                    </td>
                  ))}
                  {renderActions && <td className="px-3 py-3">{renderActions(row)}</td>}
                </tr>
              ))}
              {!data.length && (
                <tr>
                  <td
                    colSpan={columns.length + (canBulkDelete ? 1 : 0) + (renderActions ? 1 : 0)}
                    className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold">Delete {selectedRows.size} item(s)?</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  This action requires admin privileges
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
              This action cannot be undone. All selected records will be permanently removed from the system.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {deleting ? 'Deleting…' : 'Delete All'}
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
