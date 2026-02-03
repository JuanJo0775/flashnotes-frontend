// src/lib/utils/validators.ts

// ...existing code...

/**
 * Valida si un valor es un ObjectId de MongoDB (24 hex)
 */
export function isValidObjectId(id: unknown): boolean {
    return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}
