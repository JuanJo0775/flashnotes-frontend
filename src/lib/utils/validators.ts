// src/lib/utils/validators.ts

/**
 * Valida si un valor es un ObjectId de MongoDB (24 hex)
 */
export function isValidObjectId(id: unknown): boolean {
    return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Valida el formato del título de una nota
 * - No puede estar vacío o contener solo espacios
 * - Máximo 100 caracteres
 * - Permite: letras, números, espacios, puntuación segura
 * - Rechaza: HTML, caracteres de control, secuencias peligrosas
 */
export function validateTitle(title: unknown): { valid: boolean; error?: string } {
    if (typeof title !== 'string') {
        return { valid: false, error: 'El título debe ser un texto' };
    }

    const trimmed = title.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'El título no puede estar vacío' };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: 'El título no puede superar 100 caracteres' };
    }

    // Regex Unicode: letras, números, espacios, puntuación segura
    const titleRegex = /^[\p{L}\p{N}\s\-.,!?¿¡'"()&*+/=\[\]{}@#$€£¥%^~`|\\:;«»„“„”…–—~]{1,100}$/u;

    if (!titleRegex.test(trimmed)) {
        return { valid: false, error: 'El título contiene caracteres inválidos' };
    }

    return { valid: true };
}

/**
 * Valida el contenido de una nota
 * - Máximo 10,000 caracteres
 * - Puede estar vacío
 */
export function validateContent(content: unknown): { valid: boolean; error?: string } {
    if (typeof content !== 'string') {
        return { valid: false, error: 'El contenido debe ser un texto' };
    }

    if (content.length > 10000) {
        return { valid: false, error: 'El contenido no puede superar 10,000 caracteres' };
    }

    return { valid: true };
}

/**
 * Wrapper reutilizable para ejecutar operaciones que requieren validación de ID
 * 
 * @param id - ID de MongoDB a validar
 * @param operation - Función asincrónica a ejecutar si el ID es válido
 * @returns Promesa con el resultado de la operación o null si la validación falla
 * 
 * @example
 * const result = await withIdValidation(noteId, () => notesApi.undo(noteId));
 */
export async function withIdValidation<T>(
    id: string,
    operation: () => Promise<T>
): Promise<T | null> {
    if (!isValidObjectId(id)) {
        const error = new Error('ID inválido para esta operación');
        console.error('[withIdValidation]', error);
        throw error;
    }

    try {
        return await operation();
    } catch (error) {
        console.error('[withIdValidation] Operation failed:', error);
        throw error;
    }
}

/**
 * Sanitiza y valida un objeto de entrada
 * Elimina campos no permitidos y valida el contenido
 * 
 * @param data - Datos a sanitizar
 * @param allowedFields - Campos permitidos
 * @returns Datos sanitizados
 */
export function sanitizeInput<T extends Record<string, unknown>>(
    data: unknown,
    allowedFields: (keyof T)[]
): Partial<T> {
    if (typeof data !== 'object' || data === null) {
        return {};
    }

    const sanitized: Partial<T> = {};

    for (const field of allowedFields) {
        if (field in data) {
            const value = (data as Record<string, unknown>)[field as string];
            // Aplicar trim si es string
            sanitized[field] = typeof value === 'string' ? value.trim() : value;
        }
    }

    return sanitized;
}
