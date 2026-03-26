'use client';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Trash2, ChevronLeft, ChevronRight, AlertTriangle, Settings2, Check } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { useReactTable, getCoreRowModel, VisibilityState, getPaginationRowModel, getFilteredRowModel } from '@tanstack/react-table';
import { useAuthStore } from '@/features/auth/useAuth';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { TableSkeleton } from './skeleton';

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
  totalItems?: number;
  itemsPerPage?: number;
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
  defaultVisibility?: VisibilityState;
  // Row className function for custom row styling (e.g., ownership dimming)
  rowClassName?: (row: T) => string;
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
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  bulkDeleteEndpoint,
  onBulkDelete,
  onBulkDeleteSuccess,
  renderActions,
  selectionDisabled = false,
  meta,
  defaultVisibility = {},
  rowClassName,
}: DataTableProps<T>) {
  const { user } = useAuthStore();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Column visibility state and dropdown management
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultVisibility);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowColumnDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const reactTableColumns = useMemo(() => {
    return columns.map(col => ({
      id: String(col.key),
      header: col.header,
      accessorFn: (row: T) => row, // required by tanstack table
    }));
  }, [columns]);

  const table = useReactTable({
    data,
    columns: reactTableColumns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnVisibility,
      globalFilter,
      // When using server-side pagination (onPageChange provided), set large page size
      // to avoid client-side pagination hiding rows that the server already returned
      pagination: {
        pageIndex: 0,
        pageSize: onPageChange ? 9999 : 10,
      },
    },
  });

  const visibleColumns = columns.filter(col => {
    const tableCol = table.getColumn(String(col.key));
    return tableCol ? tableCol.getIsVisible() : true;
  });

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

      {/* Search and Column Visibility Toggle */}
      <div className="flex items-center justify-between py-2 gap-3">
        <input
          placeholder="Search all columns..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm w-full h-7 rounded-md border border-[hsl(var(--border))] px-2 py-0 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 bg-transparent"
        />

        <div className="flex-1 text-xs text-[hsl(var(--muted-foreground))] hidden sm:block">
          {selectedRows.size} of {data.length} row(s) selected.
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
            className="ml-auto hidden h-7 lg:flex items-center justify-center rounded-md border border-[hsl(var(--border))] bg-transparent px-2.5 text-xs font-medium shadow-sm hover:bg-[hsl(var(--muted))] hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            View Columns
          </button>

          {showColumnDropdown && (
            <div className="absolute right-0 top-full z-50 mt-1 w-[180px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-md max-h-[60vh] overflow-y-auto">
              {table.getAllLeafColumns().map((col) => {
                const isVisible = col.getIsVisible();
                const originalCol = columns.find(c => String(c.key) === col.id);
                if (!originalCol) return null;
                return (
                  <button
                    key={col.id}
                    onClick={() => col.toggleVisibility(!isVisible)}
                    className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-[hsl(var(--muted))] hover:text-accent-foreground capitalize"
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {isVisible && <Check className="h-4 w-4" />}
                    </span>
                    {originalCol.header}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="relative w-full overflow-x-auto custom-table-scrollbar rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {loading ? (
          <TableSkeleton rows={10} columns={visibleColumns.length + (renderActions ? 1 : 0)} height="h-10" />
        ) : (
          <table className="w-full text-sm whitespace-nowrap min-w-max">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>
                {/* Checkbox column - only show if user is admin and bulk delete is enabled */}
                {canBulkDelete && (
                  <th className="sticky left-0 z-30 px-2 py-1.5 text-left w-10 bg-gray-100 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                    <input
                      type="checkbox"
                      checked={data.length > 0 && selectedRows.size === data.length}
                      onChange={toggleAllSelection}
                      className="h-3.5 w-3.5 rounded border-[hsl(var(--border))] cursor-pointer"
                    />
                  </th>
                )}
                {visibleColumns.map((col, colIndex) => {
                  const isFirstDataCol = colIndex === 0 && !canBulkDelete;
                  const isLastDataCol = colIndex === visibleColumns.length - 1 && !renderActions;
                  return (
                    <th
                      key={String(col.key)}
                      className={[
                        `px-2 py-1.5 text-left font-semibold text-[11px] uppercase tracking-wide whitespace-nowrap`,
                        col.className || '',
                        isFirstDataCol
                          ? 'sticky left-0 z-30 bg-gray-100 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]'
                          : '',
                        isLastDataCol
                          ? 'sticky right-0 z-30 bg-gray-100 border-l border-gray-200 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]'
                          : '',
                      ].join(' ')}
                    >
                      {col.header}
                    </th>
                  );
                })}
                {renderActions && (
                  <th className="sticky right-0 z-30 px-2 py-1.5 text-left font-semibold text-[11px] uppercase tracking-wide bg-gray-100 border-l border-gray-200 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map(tableRow => {
                const row = tableRow.original;
                const customRowClass = rowClassName ? rowClassName(row) : '';
                return (
                  <tr
                    key={row._id}
                    className={`border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20 ${selectedRows.has(row._id) ? 'bg-[hsl(var(--primary))]/5' : ''} ${customRowClass}`}
                  >
                    {/* Checkbox cell */}
                    {canBulkDelete && (
                      <td className="sticky left-0 z-20 px-2 py-1.5 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row._id)}
                          onChange={() => toggleRowSelection(row._id)}
                          className="h-3.5 w-3.5 rounded border-[hsl(var(--border))] cursor-pointer"
                        />
                      </td>
                    )}
                    {visibleColumns.map((col, colIndex) => {
                      const isFirstDataCol = colIndex === 0 && !canBulkDelete;
                      const isLastDataCol = colIndex === visibleColumns.length - 1 && !renderActions;
                      return (
                        <td
                          key={String(col.key)}
                          className={[
                            `px-2 py-1.5 text-[13px]`,
                            col.className || '',
                            isFirstDataCol
                              ? 'sticky left-0 z-20 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]'
                              : '',
                            isLastDataCol
                              ? 'sticky right-0 z-20 bg-white border-l border-gray-200 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]'
                              : '',
                          ].join(' ')}
                        >
                          {col.render
                            ? col.render(row, meta)
                            : String(getCellValue(row, col.key) ?? '-')}
                        </td>
                      );
                    })}
                    {renderActions && <td className="sticky right-0 z-20 px-2 py-1.5 bg-white border-l border-gray-200 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">{renderActions(row)}</td>}
                  </tr>
                )
              })}
              {!table.getRowModel().rows.length && (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (canBulkDelete ? 1 : 0) + (renderActions ? 1 : 0)}
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
      {onPageChange && totalItems != null && totalItems > 0 ? (
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      ) : onPageChange ? (
        <Pagination
          currentPage={page}
          totalItems={totalPages * itemsPerPage}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      ) : null}

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
