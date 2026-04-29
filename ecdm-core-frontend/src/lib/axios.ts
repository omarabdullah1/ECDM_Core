import axios from 'axios';
import { API_BASE_URL } from './constants';
import { showError } from '@/features/common/useToast';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Never retry the token refresh endpoint itself — prevents infinite loop
        const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');

        if (error.response?.status === 401 && !originalRequest._retry && !isRefreshEndpoint) {
            originalRequest._retry = true;

            try {
                const { data } = await api.post('/auth/refresh');
                if (data.success) {
                    // Retry the original failed request with the refreshed session
                    return api(originalRequest);
                }
            } catch {
                // Refresh failed — clear session and redirect, do NOT show error toast
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('ecdm_user');
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        }

        // Don't show error toast for 401s on auth endpoints
        if (!isRefreshEndpoint && error.response?.status !== 401) {
            showError(error);
        }

        // Redirect on 401 if not already handled above
        if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
            localStorage.removeItem('ecdm_user');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    },
);

export default api;

