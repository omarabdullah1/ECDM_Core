export interface ZodErrorResponse {
    response?: {
        data?: {
            message?: string;
            errors?: Record<string, string[]>;
        };
    };
    status?: number;
}

export interface FieldError {
    field: string;
    message: string;
}

export const extractFieldErrors = (error: ZodErrorResponse): FieldError[] => {
    const errors = error?.response?.data?.errors;
    if (!errors) return [];

    return Object.entries(errors).flatMap(([field, messages]) => {
        if (!Array.isArray(messages)) return [];
        return messages.map((message) => ({ field, message }));
    });
};

export const getErrorForField = (errors: FieldError[], field: string): string | undefined => {
    return errors.find((e) => e.field === field)?.message;
};

export const hasFieldError = (errors: FieldError[], field: string): boolean => {
    return errors.some((e) => e.field === field);
};

export const mapApiErrorsToForm = (
    error: ZodErrorResponse,
    setError: (field: string, message: string) => void,
    clearErrors?: (field?: string | string[]) => void
) => {
    const fieldErrors = extractFieldErrors(error);

    if (clearErrors) clearErrors();

    fieldErrors.forEach(({ field, message }) => {
        setError(field, { type: 'server', message });
    });

    return fieldErrors.length > 0;
};

export const useFormErrorHandler = () => {
    return { extractFieldErrors, getErrorForField, hasFieldError, mapApiErrorsToForm };
};

export default useFormErrorHandler;
