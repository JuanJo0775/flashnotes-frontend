// src/lib/api/client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '@/config/env';

/**
 * Cliente HTTP base para comunicarse con el backend
 * Configurado con la URL base desde variables de entorno
 */
export const apiClient: AxiosInstance = axios.create({
    baseURL: env.API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Interceptor de respuestas para manejo centralizado de errores
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Aquí puedes agregar logging o manejo global de errores
        console.error('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.message,
        });

        return Promise.reject(error);
    }
);

/**
 * Helper para extraer mensaje de error de respuestas de API
 */
export const getErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { error?: string; message?: string };
        return data?.error || data?.message || error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Error desconocido';
};