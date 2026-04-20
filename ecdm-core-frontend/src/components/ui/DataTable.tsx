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

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T, meta?: any) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T extends { _id: string }> {
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
  // Row click handler (standardized pattern for opening edit dialogs)
  onRowClick?: (row: T) => void;
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
  onRowClick,
}: DataTableProps<T>) {
  const { user } = useAuthStore();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clientPagination, setClientPagination] = useState({ pageIndex: 0, pageSize: itemsPerPage });

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
      ...(onPageChange ? {
        pagination: {
          pageIndex: 0,
          pageSize: 9999,
        }
      } : {
        pagination: clientPagination
      }),
    },
    onPaginationChange: setClientPagination,
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
            className="flex h-9 items-center gap-2 rounded-md bg-[hsl(var(--destructive))] px-4 text-sm font-medium text-[hsl(var(--destructive-foreground))] shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
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
          className="max-w-sm w-full h-9 rounded-full border border-[hsl(var(--border))]/60 px-4 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 bg-[hsl(var(--background))]/50 hover:bg-[hsl(var(--background))] hover:premium-shadow"
        />

        <div className="flex-1 text-sm text-[hsl(var(--muted-foreground))] hidden sm:block">
          {selectedRows.size} of {data.length} row(s) selected.
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
            className="ml-auto flex h-9 items-center justify-center rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-4 text-sm font-medium shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-colors"
          >
            <Settings2 className="mr-2 h-4 w-4" />
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
      <div className="relative w-full max-w-full overflow-x-auto custom-table-scrollbar modern-glass-card premium-shadow rounded-xl border border-[hsl(var(--border))]/40">
        {loading ? (
          <TableSkeleton rows={10} columns={visibleColumns.length + (renderActions ? 1 : 0)} height="h-10" />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="hidden md:table-header-group sticky top-0 z-40 bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <tr>
                {/* Checkbox column - only show if user is admin and bulk delete is enabled */}
                {canBulkDelete && (
                  <th className="sticky left-0 z-50 p-3 text-left w-10 bg-[hsl(var(--card))] border-b border-r border-[hsl(var(--border))]/50">
                    <input
                      type="checkbox"
                      checked={data.length > 0 && selectedRows.size === data.length}
                      onChange={toggleAllSelection}
                      className="h-4 w-4 rounded border-[hsl(var(--border))] cursor-pointer accent-[hsl(var(--primary))]"
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
                        `p-4 text-left text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate border-b border-[hsl(var(--border))]/30 bg-[hsl(var(--muted))]/5 min-w-0`,
                        col.className || '',
                        isFirstDataCol
                          ? 'sticky left-0 z-50 bg-[hsl(var(--card))] shadow-[1px_0_0_0_hsl(var(--border))]'
                          : '',
                        isLastDataCol
                          ? 'sticky right-0 z-50 bg-[hsl(var(--card))] shadow-[-1px_0_0_0_hsl(var(--border))]'
                          : '',
                      ].join(' ')}
                      title={col.header}
                    >
                      {col.header}
                    </th>
                  );
                })}
                {renderActions && (
                  <th className="sticky right-0 z-50 p-3 text-left text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider bg-[hsl(var(--card))] border-b border-l border-[hsl(var(--border))]/50 shadow-[-1px_0_0_0_hsl(var(--border))]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="block md:table-row-group p-4 md:p-0">
              {table.getRowModel().rows.map(tableRow => {
                const row = tableRow.original;
                const customRowClass = rowClassName ? rowClassName(row) : '';
                return (
                  <tr
                    key={row._id}
                    className={`flex flex-col mb-4 p-4 border border-[hsl(var(--border))]/50 rounded-lg bg-[hsl(var(--card))] shadow-sm md:table-row md:mb-0 md:p-0 md:border-x-0 md:border-t-0 md:border-b md:rounded-none md:shadow-none md:bg-transparent transition-colors hover:bg-[hsl(var(--muted))]/50 ${selectedRows.has(row._id) ? 'bg-[hsl(var(--primary))]/5' : ''} ${customRowClass} cursor-pointer group`}
                    onClick={(e) => {
                      // 1. Prevent action if user is currently selecting text
                      const selection = window.getSelection();
                      if (selection && selection.toString().trim() !== '') return;

                      // 2. Ignore if clicking interactive elements
                      const target = e.target as HTMLElement;
                      if (target.closest('button, input, select, textarea, a, label')) return;

                      // 3. Ignore if clicking the checkbox column (first td if bulk delete is enabled)
                      if (canBulkDelete) {
                        const td = target.closest('td');
                        // Ensure it's the first td in this row
                        if (td && td === e.currentTarget.firstElementChild) {
                           // If user clicked the empty padding of checkbox cell, toggle checkbox instead
                           toggleRowSelection(row._id);
                           return;
                        }
                      }

                      // 4. Use explicit onRowClick if provided
                      if (onRowClick) {
                        onRowClick(row);
                        return;
                      }

                      // 5. Fallback: Try finding an explicit Edit button
                      const rowEl = e.currentTarget;
                      let actionEl = rowEl.querySelector(
                        'button[title*="Edit" i], button[title*="تعديل" i], a[title*="Edit" i], a[title*="تعديل" i]'
                      ) as HTMLElement | null;

                      // Fallback: look for a button containing the Edit icon
                      if (!actionEl) {
                        const editIcon = rowEl.querySelector('.lucide-edit, .lucide-edit2, .lucide-edit-2, [data-lucide="edit"]');
                        if (editIcon) {
                           actionEl = editIcon.closest('button, a') as HTMLElement | null;
                        }
                      }

                      if (actionEl) {
                        actionEl.click();
                      }
                    }}
                  >
                    {/* Checkbox cell */}
                    {canBulkDelete && (
                      <td className="flex justify-between items-center py-2 md:table-cell md:p-3 md:sticky md:left-0 z-30 md:bg-[hsl(var(--card))] md:border-r border-[hsl(var(--border))]/50 group-hover:bg-[hsl(var(--muted))]/50 transition-colors border-b border-[hsl(var(--border))]/20 md:border-b-0">
                        <span className="md:hidden font-bold text-xs uppercase text-[hsl(var(--muted-foreground))]">Select</span>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row._id)}
                          onChange={() => toggleRowSelection(row._id)}
                          className="h-4 w-4 rounded border-[hsl(var(--border))] cursor-pointer accent-[hsl(var(--primary))]"
                        />
                      </td>
                    )}
                    {visibleColumns.map((col, colIndex) => {
                      const isFirstDataCol = colIndex === 0 && !canBulkDelete;
                      const isLastDataCol = colIndex === visibleColumns.length - 1 && !renderActions;
                      
                      // Safely serialize text value for tooltip title
                      let titleContent = '';
                      try {
                        const val = getCellValue(row, col.key);
                        if (typeof val === 'string' || typeof val === 'number') {
                          titleContent = String(val);
                        } else if (val && typeof val === 'object') {
                          // Avoid Object [object]
                          titleContent = '';
                        }
                      } catch (e) {
                         // ignore
                      }
                      
                      return (
                        <td
                          key={String(col.key)}
                          className={[
                            `flex justify-between items-center py-2 md:table-cell md:p-3 text-[12px] font-medium truncate overflow-hidden whitespace-nowrap w-full md:w-auto min-w-0`,
                            col.className || '',
                            isFirstDataCol
                              ? 'md:sticky md:left-0 z-30 md:bg-[hsl(var(--card))] md:border-r border-[hsl(var(--border))]/50 group-hover:bg-[hsl(var(--muted))]/50 transition-colors'
                              : '',
                            isLastDataCol
                              ? 'md:sticky md:right-0 z-30 md:bg-[hsl(var(--card))] md:border-l border-[hsl(var(--border))]/50 group-hover:bg-[hsl(var(--muted))]/50 transition-colors'
                              : '',
                            'border-b border-[hsl(var(--border))]/20 md:border-b-0 last:border-b-0'
                          ].join(' ')}
                          title={titleContent}
                        >
                          <span className="md:hidden font-bold text-xs uppercase text-[hsl(var(--muted-foreground))] mr-4 flex-shrink-0">
                            {col.header}
                          </span>
                          <div className="truncate overflow-hidden whitespace-nowrap flex-1 text-right md:text-left">
                            {col.render
                              ? col.render(row, meta)
                              : <span className="text-[hsl(var(--foreground))]">{String(getCellValue(row, col.key) ?? '-')}</span>}
                          </div>
                        </td>
                      );
                    })}
                    {renderActions && (
                      <td className="flex justify-end items-center py-2 md:table-cell md:p-3 md:sticky md:right-0 z-30 md:bg-[hsl(var(--card))] md:border-l border-[hsl(var(--border))]/50 group-hover:bg-[hsl(var(--muted))]/50 transition-colors pt-4 mt-2 border-t md:border-t-0 md:mt-0 border-[hsl(var(--border))]/30">
                        {renderActions(row)}
                      </td>
                    )}
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
      ) : data.length > 0 ? (
        <Pagination
          currentPage={clientPagination.pageIndex + 1}
          totalItems={data.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(p) => setClientPagination(prev => ({ ...prev, pageIndex: p - 1 }))}
        />
      ) : null}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
          <div className="rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--card))] p-6 shadow-lg sm:max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[hsl(var(--destructive))]/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[hsl(var(--destructive))]" />
              </div>
              <div>
                <p className="font-semibold text-lg">Delete {selectedRows.size} item(s)?</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  This action requires admin privileges
                </p>
              </div>
            </div>
            <p className="mb-6 text-sm text-[hsl(var(--muted-foreground))]">
              This action cannot be undone. All selected records will be permanently removed from the system.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={deleting}
                className="mt-2 sm:mt-0 inline-flex h-9 items-center justify-center rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[hsl(var(--destructive))] px-4 py-2 text-sm font-medium text-[hsl(var(--destructive-foreground))] shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
