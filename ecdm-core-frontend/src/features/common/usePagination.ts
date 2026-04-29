'use client';

import { create } from 'zustand';

export interface PaginationState {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    search: string;
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;
    setSearch: (search: string) => void;
    setTotal: (total: number) => void;
    reset: () => void;
    nextPage: () => void;
    prevPage: () => void;
    goToPage: (page: number) => void;
}

const defaultPagination = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    search: '',
};

export const usePaginationStore = create<PaginationState>((set, get) => ({
    ...defaultPagination,

    setPage: (page: number) => set({ page }),
    
    setLimit: (limit: number) => set({ limit, page: 1 }),
    
    setSearch: (search: string) => set({ search, page: 1 }),
    
    setTotal: (total: number) => {
        const { limit } = get();
        set({ total, totalPages: Math.ceil(total / limit) });
    },
    
    reset: () => set(defaultPagination),
    
    nextPage: () => {
        const { page, totalPages } = get();
        if (page < totalPages) set({ page: page + 1 });
    },
    
    prevPage: () => {
        const { page } = get();
        if (page > 1) set({ page: page - 1 });
    },
    
    goToPage: (page: number) => {
        const { totalPages } = get();
        if (page >= 1 && page <= totalPages) set({ page });
    },
}));

export const usePagination = () => {
    const store = usePaginationStore();
    
    const buildQueryParams = () => {
        const params = new URLSearchParams();
        params.set('page', String(store.page));
        params.set('limit', String(store.limit));
        if (store.search) params.set('search', store.search);
        return params.toString();
    };
    
    return {
        ...store,
        buildQueryParams,
    };
};

export default usePaginationStore;

