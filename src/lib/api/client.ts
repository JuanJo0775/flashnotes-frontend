// src/lib/api/client.ts
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { env } from '@/config/env';
import type { ApiResponse } from '@/types/api.types';

/**
 * Variable global para almacenar el token CSRF
 * SECURITY: Se obtiene del endpoint /api/csrf-token
 */
let csrfToken: string | null = null;

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
 * Función para obtener y almacenar el token CSRF
 * SECURITY: Debe llamarse al inicializar la aplicación
 */
export const initializeCsrfToken = async (): Promise<string | null> => {
    try {
        const response = await apiClient.get('/csrf-token');
        const data = response.data as ApiResponse<{ csrfToken: string }>;
        
        if (data.success && data.data?.csrfToken) {
            csrfToken = data.data.csrfToken;
            return csrfToken;
        }
    } catch (error) {
        console.warn('Failed to initialize CSRF token:', error);
    }
    return null;
};

/**
 * Obtener el token CSRF actual
 */
export const getCsrfToken = (): string | null => csrfToken;

/**
 * Establecer token CSRF manualmente
 */
export const setCsrfToken = (token: string): void => {
    csrfToken = token;
};

/**
 * Interceptor de requests para agregar token CSRF
 * SECURITY: Se incluye en todas las requests de escritura (POST, PATCH, PUT, DELETE)
 */
apiClient.interceptors.request.use((config) => {
    if (csrfToken && ['post', 'patch', 'put', 'delete'].includes(config.method?.toLowerCase() || '')) {
        config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

/**
 * Map para rastrear intentos de retry por request
 * Usa el config object como clave para asociar reintentos a requests específicos
 */
const retryMap = new WeakMap<Record<string, unknown>, number>();

/**
 * Configuración de reintentos con exponential backoff
 */
const RETRY_CONFIG = {
    maxRetries: 3,
    retryableStatuses: [429, 503], // Too Many Requests, Service Unavailable
    initialDelayMs: 2000, // 2 segundos para el primer reintento
};

/**
 * Calcula el delay con exponential backoff: 2s, 4s, 8s, etc.
 */
function getBackoffDelay(retryCount: number): number {
    return RETRY_CONFIG.initialDelayMs * Math.pow(2, retryCount - 1);
}

/**
 * Interceptor de respuestas para validar contrato y manejo centralizado de errores
 * Incluye reintentos automáticos con exponential backoff para errores temporales
 */
apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        // Limpiar contador de reintentos en caso de éxito
        if (response.config && response.config.data) {
            retryMap.delete(response.config as any);
        }

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
    async (error: AxiosError) => {
        const config = error.config as any;

        // Si no hay config o es una request de reintentos fallidos, rechazar inmediatamente
        if (!config) {
            console.error('API Error (no config):', {
                status: error.response?.status,
                message: error.message,
            });
            return Promise.reject(error);
        }

        // Contar reintentos actuales para este request
        const currentRetry = retryMap.get(config) || 0;
        const shouldRetry =
            currentRetry < RETRY_CONFIG.maxRetries &&
            error.response &&
            RETRY_CONFIG.retryableStatuses.includes(error.response.status);

        if (shouldRetry) {
            const nextRetry = currentRetry + 1;
            retryMap.set(config, nextRetry);

            const delay = getBackoffDelay(nextRetry);
            console.warn(
                `[Retry ${nextRetry}/${RETRY_CONFIG.maxRetries}] ` +
                `${error.config?.method?.toUpperCase()} ${error.config?.url} ` +
                `(status ${error.response?.status}) - esperando ${delay}ms...`
            );

            // Esperar el tiempo calculado
            await new Promise((resolve) => setTimeout(resolve, delay));

            // Reintentar la request
            return apiClient.request(config);
        }

        // Log detallado de errores que no se pueden reintentar
        const responseData = error.response?.data as any;
        const errorDetails = {
            url: error.config?.url,
            method: error.config?.method?.toUpperCase(),
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message,
            retryAttempts: currentRetry,
        };
        
        // Si no hay response.data, es probable un error de CORS o red
        if (!error.response?.data) {
            console.error('🔴 API Error (CORS/Red):', {
                ...errorDetails,
                hint: 'El servidor no respondió o CORS bloqueó la respuesta. Verifica que el backend esté corriendo y CORS configurado correctamente.'
            });
        } else {
            // Extraer mensaje legible del formato estándar de API
            const backendMessage = responseData?.message || responseData?.error || 'Sin mensaje del servidor';
            const backendError = responseData?.error || 'UNKNOWN_ERROR';
            const backendDetails = responseData?.details;
            
            console.error(
                `🔴 API Error [${error.response.status}]:`,
                '\n  URL:', `${errorDetails.method} ${errorDetails.url}`,
                '\n  Backend Error:', backendError,
                '\n  Backend Message:', backendMessage,
                backendDetails ? '\n  Details:' : '', backendDetails || '',
                '\n  Raw Response:', JSON.stringify(responseData, null, 2),
                '\n  Axios Message:', error.message
            );
        }

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