// ── Pagination utility ──────────────────────────────────────────────

export interface PaginationQuery {
    page?: string;
    limit?: string;
}

export interface PaginationOptions {
    page: number;
    limit: number;
    skip: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

/**
 * Parse raw query params into safe pagination options.
 */
export const parsePagination = (query: PaginationQuery): PaginationOptions => {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

/**
 * Build a standardised paginated response envelope.
 */
export const buildPaginatedResult = <T>(
    data: T[],
    total: number,
    options: PaginationOptions,
): PaginatedResult<T> => ({
    data,
    pagination: {
        total,
        page: options.page,
        limit: options.limit,
        pages: Math.ceil(total / options.limit),
    },
});
