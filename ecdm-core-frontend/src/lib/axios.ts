import axios from 'axios';
import { API_BASE_URL } from './constants';

const api = axios.create({
    baseURL: API_BASE_URL,
    // Don't set Content-Type globally - let axios handle it per request (especially for FormData)
    timeout: 15000,
});

// ── Request interceptor: attach JWT and handle Content-Type ─────────
api.interceptors.request.use((config) => {
    // Attach JWT token
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('ecdm_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    
    // Only set Content-Type to application/json if it's not already set
    // and the data is NOT FormData (FormData needs multipart/form-data with boundary)
    if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
});

// ── Response interceptor: handle 401 ────────────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('ecdm_token');
            localStorage.removeItem('ecdm_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

export default api;
