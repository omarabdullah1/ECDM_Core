'use client';

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalItems === 0) return null;

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  // Build visible page numbers with ellipsis for large ranges
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: (number | '...')[] = [1];

    if (currentPage > 3) pages.push('...');

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push('...');

    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-[hsl(var(--border))]/40 bg-[hsl(var(--secondary))]/30 rounded-b-xl">
      <div className="text-sm text-[hsl(var(--muted-foreground))] font-medium hidden sm:block">
        Showing{' '}
        <span className="text-[hsl(var(--foreground))] font-semibold">{from}</span> to{' '}
        <span className="text-[hsl(var(--foreground))] font-semibold">{to}</span> of{' '}
        <span className="text-[hsl(var(--foreground))] font-semibold">{totalItems}</span> results
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] disabled:opacity-50 hover:bg-[hsl(var(--secondary))] transition-colors shadow-sm text-[hsl(var(--foreground))]"
        >
          Previous
        </button>
        <div className="flex items-center gap-1 hidden sm:flex">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                  currentPage === p
                    ? 'bg-[hsl(var(--primary))] text-white premium-shadow'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] disabled:opacity-50 hover:bg-[hsl(var(--secondary))] transition-colors shadow-sm text-[hsl(var(--foreground))]"
        >
          Next
        </button>
      </div>
    </div>
  );
}
