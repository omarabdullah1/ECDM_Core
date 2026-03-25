'use client';

import { Toaster, toast } from 'react-hot-toast';

export interface ApiError {
    response?: {
        status?: number;
        data?: {
            message?: string;
            errors?: Record<string, string[]>;
        };
    };
    request?: {
        response?: {
            message?: string;
        };
    };
    message?: string;
}

export const showError = (error: ApiError, fallback = 'An error occurred') => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || fallback;
    
    switch (status) {
        case 400:
            toast.error(`Bad Request: ${message}`);
            break;
        case 401:
            toast.error('Session expired. Please log in again.');
            break;
        case 403:
            toast.error('You do not have permission to perform this action.');
            break;
        case 404:
            toast.error('Resource not found.');
            break;
        case 409:
            toast.error(message);
            break;
        case 422:
            const errors = error.response?.data?.errors;
            if (errors) {
                Object.entries(errors).forEach(([field, messages]) => {
                    if (Array.isArray(messages)) {
                        messages.forEach((msg) => toast.error(`${field}: ${msg}`));
                    }
                });
            } else {
                toast.error(message);
            }
            break;
        case 500:
            toast.error('Server error. Please try again later.');
            break;
        default:
            toast.error(message);
    }
};

export const showSuccess = (message: string) => {
    toast.success(message);
};

export const showLoading = (message: string) => {
    return toast.loading(message);
};

export const dismissToast = () => {
    toast.dismiss();
};

export const ToastProvider = () => (
    <Toaster
        position="top-right"
        toastOptions={{
            duration: 4000,
            style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
            },
            success: {
                iconTheme: {
                    primary: 'hsl(var(--primary))',
                    secondary: 'hsl(var(--card))',
                },
            },
            error: {
                iconTheme: {
                    primary: 'hsl(var(--destructive))',
                    secondary: 'hsl(var(--card))',
                },
            },
        }}
    />
);

export default toast;
