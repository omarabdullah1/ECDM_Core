'use client';

import { create } from 'zustand';
import api from '@/lib/axios';

interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
    fullName?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: Record<string, string>) => Promise<void>;
    logout: () => void;
    loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
    // If a token already exists, start in loading state so the dashboard
    // waits for loadUser() to verify it before deciding to redirect.
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('ecdm_token') : null;

    return {
    user: null,
    token: storedToken,
    isLoading: !!storedToken,   // ← prevent premature redirect on refresh
    isAuthenticated: false,

    login: async (email, password) => {
        set({ isLoading: true });
        try {
            const { data } = await api.post('/auth/login', { email, password });
            const { user, token } = data.data;
            localStorage.setItem('ecdm_token', token);
            localStorage.setItem('ecdm_user', JSON.stringify(user));
            set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
            set({ isLoading: false });
            const err = error as { response?: { data?: { message?: string } } };
            throw new Error(err.response?.data?.message || 'Login failed');
        }
    },

    register: async (formData) => {
        set({ isLoading: true });
        try {
            const { data } = await api.post('/auth/register', formData);
            const { user, token } = data.data;
            localStorage.setItem('ecdm_token', token);
            localStorage.setItem('ecdm_user', JSON.stringify(user));
            set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
            set({ isLoading: false });
            const err = error as { response?: { data?: { message?: string } } };
            throw new Error(err.response?.data?.message || 'Registration failed');
        }
    },

    logout: () => {
        localStorage.removeItem('ecdm_token');
        localStorage.removeItem('ecdm_user');
        set({ user: null, token: null, isAuthenticated: false });
        window.location.href = '/login';
    },

    loadUser: async () => {
        const token = localStorage.getItem('ecdm_token');
        if (!token) {
            set({ isAuthenticated: false, isLoading: false });
            return;
        }
        try {
            set({ isLoading: true });
            const { data } = await api.get('/auth/me');
            set({ user: data.data.user, token, isAuthenticated: true, isLoading: false });
        } catch {
            localStorage.removeItem('ecdm_token');
            localStorage.removeItem('ecdm_user');
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
    },
    };
});
