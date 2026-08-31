// src/config/limits.ts

/**
 * Espejo de flashnotes-backend/src/config/limits.js.
 *
 * Son un contrato entre las dos apps: si cambiás un valor acá, cambialo allá.
 * Antes había tres cifras distintas para lo mismo (constants.ts decía 200 y
 * 100 000; el validador del cliente, 100 y 10 000; el backend, 100 y 10 000),
 * así que el cliente dejaba pasar títulos que el servidor rechazaba con 400.
 */
export const LIMITS = {
    TITLE_MAX: 100,
    CONTENT_MAX: 10000,
    HISTORY_MAX: 20,
} as const;

/**
 * Mismas reglas de título que el backend, como lista negra:
 * sin caracteres de control ni de formato, y sin `<` ni `>`.
 * Todo lo demás vale — acentos, ¿¡, €, emojis.
 */
export const FORBIDDEN_TITLE_CONTROL = /[\p{Cc}\p{Cf}]/u;
export const FORBIDDEN_TITLE_MARKUP = /[<>]/;
