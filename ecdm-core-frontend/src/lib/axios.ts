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
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const { data } = await api.post('/auth/refresh');
                if (data.success && data.data.accessToken) {
                    return api(originalRequest);
                }
            } catch (refreshError) {
                showError(refreshError as Parameters<typeof showError>[0], 'Session expired. Please log in again.');
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('ecdm_user');
                    window.location.href = '/login';
                }
            }
        }
        
        showError(error);
        
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('ecdm_user');
            window.location.href = '/login';
        }
        
        return Promise.reject(error);
    },
);

export default api;
