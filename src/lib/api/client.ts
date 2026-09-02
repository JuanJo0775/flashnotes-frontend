// src/lib/api/client.ts
import axios, {
    AxiosError,
    AxiosInstance,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/config/env';
import type { ApiResponse } from '@/types/api.types';
import { getLang, translateMessage, hasKey } from '@/i18n';
import type { Message } from '@/i18n';
import { record as recordRequest } from '@/lib/system/requestLog';

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
 * Registro de peticiones.
 *
 * El backend loguea cada llamada en su consola (requestLogger.js); esto es el
 * espejo del lado del cliente, y es lo que leen el comando `>log` y el archivo
 * SYSTEM.LOG de la papelera. Su gracia está en que no es decoración: cada línea
 * ocurrió de verdad.
 *
 * Sólo se anotan método, ruta, código y duración. Ni el cuerpo enviado ni el
 * recibido entran nunca — la regla del proyecto es que el contenido de una nota
 * no se lee, y acá tampoco.
 */
type TimedConfig = InternalAxiosRequestConfig & { _startedAt?: number };

apiClient.interceptors.request.use((config: TimedConfig) => {
    config._startedAt = Date.now();
    return config;
});

function logRequest(config: TimedConfig | undefined, status: number) {
    if (!config) return;

    recordRequest({
        method: (config.method ?? 'get').toUpperCase(),
        path: config.url ?? '',
        status,
        durationMs: Date.now() - (config._startedAt ?? Date.now()),
    });
}

apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        logRequest(response.config as TimedConfig, response.status);
        return response;
    },
    (error: AxiosError) => {
        // Sin respuesta (red caída, timeout) se anota como 0: que la petición
        // saliera y no volviera es justamente lo que interesa ver en el log.
        logRequest(error.config as TimedConfig | undefined, error.response?.status ?? 0);
        return Promise.reject(error);
    }
);

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
 * Traduce cualquier error a un mensaje que se le pueda enseñar a una persona:
 * qué pasó y, cuando se puede, qué hacer.
 *
 * Devuelve la CLAVE sin resolver, no el texto. Guardar el texto ya traducido en
 * el estado de React dejaba la pantalla mezclada al cambiar de idioma: todo en
 * español menos el error, resuelto en inglés cuando ocurrió.
 *
 * SE MAPEA POR CÓDIGO, NO POR MENSAJE. El backend ya manda un código estable en
 * `data.error` (`VALIDATION_FAILED`, `INVALID_ID_FORMAT`, …) junto a un
 * `message` que está SIEMPRE en español. Antes se enseñaba ese `message`, así
 * que la app en inglés soltaba frases en español en cuanto algo fallaba. Ahora
 * el mensaje del servidor sólo se usa para depurar.
 *
 * Los `details` de validación tampoco se enseñan por el mismo motivo: son prosa
 * de Mongoose, en español. El cliente ya valida con los mismos límites que el
 * servidor (`config/limits.ts`), así que un error de validación del servidor es
 * un caso raro, no la vía normal de avisar al usuario.
 */
export const getErrorInfo = (error: unknown): Message => {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data as ApiResponse<unknown> | undefined;

        // Sin respuesta no hay código que mirar: no llegó a haber conversación.
        if (!error.response) return { key: 'error.NETWORK_ERROR' };

        const key = `error.${data?.error ?? ''}`;
        if (hasKey(key)) return { key };

        // Un código que este frontend no conoce todavía: se cae al estado HTTP,
        // que al menos es información, en vez de pintar la clave cruda.
        if (status === 429) return { key: 'error.TOO_MANY_REQUESTS' };
        if (status) return { key: 'error.withStatus', vars: { status } };

        return { key: 'error.UNKNOWN' };
    }

    // Un Error de JavaScript lleva un mensaje técnico que no está traducido y no
    // se escribió para nadie. Se registra, pero al usuario se le dice lo genérico.
    if (error instanceof Error) {
        console.error('[api] error no-HTTP:', error.message);
    }

    return { key: 'error.UNKNOWN' };
};

/**
 * El mismo error, ya resuelto al idioma actual.
 *
 * Sólo para quien necesite un texto AHORA y no vaya a guardarlo. Lo que se
 * guarda en estado tiene que ser el `Message` de `getErrorInfo`: un texto ya
 * traducido se queda congelado en el idioma que hubiera cuando falló.
 */
export const getErrorMessage = (error: unknown): string =>
    translateMessage(getLang(), getErrorInfo(error));

