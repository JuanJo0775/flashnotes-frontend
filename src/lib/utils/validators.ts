// src/lib/utils/validators.ts

import {
    LIMITS,
    FORBIDDEN_TITLE_CONTROL,
    FORBIDDEN_TITLE_MARKUP,
} from '@/config/limits';

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Valida si un valor es un ObjectId de MongoDB (24 hex)
 */
export function isValidObjectId(id: unknown): id is string {
    return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Valida el título de una nota con las MISMAS reglas que el backend.
 *
 * La versión anterior usaba una lista blanca de puntuación distinta de la del
 * servidor: el cliente aceptaba `¿Qué tal?` y `Gastos 100€`, el servidor los
 * rechazaba con 400, y el usuario veía un error sin explicación.
 */
export function validateTitle(title: unknown): ValidationResult {
    if (typeof title !== 'string') {
        return { valid: false, error: 'El título debe ser un texto' };
    }

    const trimmed = title.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'El título no puede estar vacío' };
    }

    if (trimmed.length > LIMITS.TITLE_MAX) {
        return {
            valid: false,
            error: `El título no puede superar ${LIMITS.TITLE_MAX} caracteres`,
        };
    }

    if (FORBIDDEN_TITLE_CONTROL.test(trimmed)) {
        return { valid: false, error: 'El título no puede tener saltos de línea' };
    }

    if (FORBIDDEN_TITLE_MARKUP.test(trimmed)) {
        return { valid: false, error: 'El título no puede contener < ni >' };
    }

    return { valid: true };
}

/**
 * Valida el contenido de una nota. Puede estar vacío; sólo se acota el tamaño.
 */
export function validateContent(content: unknown): ValidationResult {
    if (typeof content !== 'string') {
        return { valid: false, error: 'El contenido debe ser un texto' };
    }

    if (content.length > LIMITS.CONTENT_MAX) {
        return {
            valid: false,
            error: `El contenido no puede superar ${LIMITS.CONTENT_MAX.toLocaleString('es')} caracteres`,
        };
    }

    return { valid: true };
}

/**
 * Ejecuta una operación sólo si el ID es un ObjectId válido.
 *
 * Lanza si el ID no sirve y propaga el error de la operación: nunca devuelve
 * null. La firma anterior decía `Promise<T | null>`, que no describía lo que el
 * cuerpo hace y era la causa de los tres errores de TypeScript que impedían
 * compilar el proyecto.
 */
export async function withIdValidation<T>(
    id: string,
    operation: () => Promise<T>
): Promise<T> {
    if (!isValidObjectId(id)) {
        throw new Error('ID inválido para esta operación');
    }

    return operation();
}

/**
 * Copia sólo los campos permitidos de un objeto de entrada, recortando strings.
 */
export function sanitizeInput<T extends Record<string, unknown>>(
    data: unknown,
    allowedFields: (keyof T)[]
): Partial<T> {
    if (typeof data !== 'object' || data === null) {
        return {};
    }

    const source = data as Record<string, unknown>;
    const sanitized: Partial<T> = {};

    for (const field of allowedFields) {
        const key = field as string;
        if (!(key in source)) continue;

        const value = source[key];
        sanitized[field] = (
            typeof value === 'string' ? value.trim() : value
        ) as T[keyof T];
    }

    return sanitized;
}
