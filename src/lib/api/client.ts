// src/lib/api/client.ts
import axios, {
    AxiosError,
    AxiosInstance,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/config/env';
import type { ApiResponse } from '@/types/api.types';

/** Token CSRF vigente, obtenido de /api/csrf-token al arrancar la app. */
let csrfToken: string | null = null;

export const apiClient: AxiosInstance = axios.create({
    baseURL: env.API_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // manda la cookie de sesión en cada petición
});

/**
 * Pide el token CSRF y lo guarda. Se llama una vez al montar la app.
 */
export const initializeCsrfToken = async (): Promise<string | null> => {
    try {
        const response = await apiClient.get<ApiResponse<{ csrfToken: string }>>(
            '/csrf-token'
        );
        const token = response.data?.data?.csrfToken;

        if (response.data.success && token) {
            csrfToken = token;
            return token;
        }
    } catch {
        // Sin token, las escrituras fallarán con 403 y el error se mostrará
        // en la interfaz. No hay nada que hacer acá.
    }
    return null;
};

export const getCsrfToken = (): string | null => csrfToken;

const WRITE_METHODS = ['post', 'patch', 'put', 'delete'];

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase() ?? '';
    if (csrfToken && WRITE_METHODS.includes(method)) {
        config.headers.set('X-CSRF-Token', csrfToken);
    }
    return config;
});

/**
 * Reintentos con backoff exponencial.
 *
 * 429 quedó FUERA de la lista a propósito: reintentar una petición que el
 * servidor rechazó por exceso de peticiones consume más presupuesto del mismo
 * límite que acaba de agotarse. Si llega un 429, se respeta y se informa.
 */
const RETRY_CONFIG = {
    maxRetries: 2,
    retryableStatuses: [502, 503, 504],
    initialDelayMs: 1000,
};

type RetryableConfig = InternalAxiosRequestConfig & { _retryCount?: number };

const backoffDelay = (attempt: number) =>
    RETRY_CONFIG.initialDelayMs * 2 ** (attempt - 1);

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const config = error.config as RetryableConfig | undefined;
        const status = error.response?.status;

        if (config && status && RETRY_CONFIG.retryableStatuses.includes(status)) {
            const attempt = (config._retryCount ?? 0) + 1;

            if (attempt <= RETRY_CONFIG.maxRetries) {
                config._retryCount = attempt;
                await new Promise((r) => setTimeout(r, backoffDelay(attempt)));
                return apiClient.request(config);
            }
        }

        return Promise.reject(error);
    }
);

/**
 * Traduce cualquier error a un mensaje en español que se le pueda enseñar a
 * una persona: qué pasó y, cuando se puede, qué hacer.
 */
export const getErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data as ApiResponse<unknown> | undefined;

        if (!error.response) {
            return 'No se pudo contactar el servidor. Revisá que el backend esté corriendo.';
        }

        if (status === 429) {
            return 'Demasiadas peticiones seguidas. Esperá un momento y volvé a intentar.';
        }

        if (status === 403 && data?.error === 'INVALID_CSRF_TOKEN') {
            return 'Tu sesión de seguridad expiró. Recargá la página.';
        }

        if (data?.details?.length) {
            return data.details.join('. ');
        }

        if (data?.message) {
            return data.message;
        }

        return `Error ${status ?? ''}`.trim();
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Error desconocido';
};
