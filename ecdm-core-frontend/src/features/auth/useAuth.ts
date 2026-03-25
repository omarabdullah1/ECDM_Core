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
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: Record<string, string>) => Promise<void>;
    logout: () => Promise<void>;
    loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
    return {
        user: null,
        isLoading: true,
        isAuthenticated: false,

        login: async (email, password) => {
            set({ isLoading: true });
            try {
                const { data } = await api.post('/auth/login', { email, password });
                const { user } = data.data;
                localStorage.setItem('ecdm_user', JSON.stringify(user));
                set({ user, isAuthenticated: true, isLoading: false });
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
                const { user } = data.data;
                localStorage.setItem('ecdm_user', JSON.stringify(user));
                set({ user, isAuthenticated: true, isLoading: false });
            } catch (error: unknown) {
                set({ isLoading: false });
                const err = error as { response?: { data?: { message?: string } } };
                throw new Error(err.response?.data?.message || 'Registration failed');
            }
        },

        logout: async () => {
            try {
                await api.post('/auth/logout');
            } catch {
            } finally {
                localStorage.removeItem('ecdm_user');
                set({ user: null, isAuthenticated: false });
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
            }
        },

        loadUser: async () => {
            try {
                set({ isLoading: true });
                const { data } = await api.get('/auth/me');
                set({ user: data.data.user, isAuthenticated: true, isLoading: false });
                localStorage.setItem('ecdm_user', JSON.stringify(data.data.user));
            } catch {
                localStorage.removeItem('ecdm_user');
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        },
    };
});
