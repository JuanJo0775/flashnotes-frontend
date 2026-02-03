// src/lib/api/client.ts
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { env } from '@/config/env';

/**
 * Interfaz de respuesta estándar del backend
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    details?: string[];
    statusCode: number;
}

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
    withCredentials: true, // Enviar cookies con cada request
});

/**
 * Interceptor de respuestas para validar contrato y manejo centralizado de errores
 */
apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        // Validar que la respuesta siga el formato esperado
        const data = response.data as ApiResponse<unknown>;

        // 204 No Content es válido pero sin cuerpo
        if (response.status === 204) {
            return response;
        }

        // Validar estructura mínima
        if (!('success' in data) || !('statusCode' in data)) {
            console.warn('Backend response does not match contract', {
                url: response.config.url,
                data,
            });
        }

        return response;
    },
    (error: AxiosError) => {
        // Log detallado de errores
        console.error('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message,
            data: error.response?.data,
        });

        return Promise.reject(error);
    }
);

/**
 * Helper para extraer mensaje de error de respuestas de API
 * Compatible con el nuevo formato estándar
 */
export const getErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as ApiResponse<unknown> | undefined;

        // Si la respuesta tiene nuestro formato estándar
        if (data && 'message' in data && data.message) {
            return data.message as string;
        }

        // Fallback a error code
        if (data && 'error' in data && data.error) {
            return `Error: ${data.error}`;
        }

        // Mensaje genérico del error HTTP
        if (error.response?.statusText) {
            return error.response.statusText;
        }

        return error.message || 'Error de conexión';
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Error desconocido';
};