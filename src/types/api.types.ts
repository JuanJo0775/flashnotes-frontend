/**
 * Interfaz centralizada para respuestas de API
 * Unifica el contrato entre cliente y servidor
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    details?: string[];
    statusCode: number;
}

/**
 * Interfaz heredada (deprecated) - mantener para compatibilidad temporal
 */
export interface ApiError {
    success: false;
    message: string;
    error?: string;
}

/**
 * Tipo heredado (deprecated) - mantener para compatibilidad temporal
 */
export type ApiResult<T> = ApiResponse<T> | ApiError;

/**
 * Estructura de paginación retornada en listados
 */
export interface PaginationMetadata {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

/**
 * Respuesta paginada para listados
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination?: PaginationMetadata;
}