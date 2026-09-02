// src/config/lang.ts

/**
 * Constantes del idioma, en un módulo SIN `'use client'`.
 *
 * Por el mismo motivo que `config/theme.ts`: `layout.tsx` es un Server Component
 * y necesita el VALOR de la clave para generar el script de arranque. Importarla
 * desde un módulo marcado `'use client'` le daría al servidor una referencia al
 * cliente en lugar del valor, y el script saldría con `getItem(undefined)`.
 */

export type Lang = 'es' | 'en';

export const LANG_STORAGE_KEY = 'flashnotes-lang';

/**
 * El idioma cuando no hay nada guardado y el navegador no habla ninguno de los
 * dos. Español porque es el idioma en el que la app fue escrita.
 */
export const DEFAULT_LANG: Lang = 'es';

/** Guarda de tipo: ¿esto es uno de los dos idiomas reales? */
export function isLang(value: unknown): value is Lang {
    return value === 'es' || value === 'en';
}

/**
 * `'es-AR'` -> `'es'`. Se queda con la subetiqueta primaria y descarta la región:
 * a un usuario con `es-419` o `en-GB` le hablamos igual que a uno con `es` o `en`.
 *
 * Devuelve null si el navegador habla otra cosa, para que quien llame decida —
 * no es lo mismo "no sé" que "español".
 */
export function normalizeLang(tag: string | undefined | null): Lang | null {
    if (!tag) return null;

    const primary = tag.toLowerCase().split('-')[0];
    return isLang(primary) ? primary : null;
}

/**
 * Script que estampa el idioma guardado ANTES del primer pintado.
 *
 * Hace falta por lo mismo que el del tema, y por una razón más: `<html lang>` lo
 * leen los lectores de pantalla para elegir la voz. Corregirlo al hidratar es
 * tarde — la primera lectura ya salió con el idioma equivocado.
 *
 * Si no hay nada guardado sigue al navegador aquí mismo, para que el atributo
 * sea correcto desde el primer instante. La lógica se duplica a propósito con
 * `normalizeLang`: este script es una cadena que corre antes que cualquier
 * módulo, así que no puede importar nada.
 */
export const LANG_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(
    LANG_STORAGE_KEY
)};var l=localStorage.getItem(k);if(l!=="es"&&l!=="en"){var n=(navigator.language||"").toLowerCase().split("-")[0];l=(n==="es"||n==="en")?n:${JSON.stringify(
    DEFAULT_LANG
)}}document.documentElement.setAttribute("lang",l)}catch(e){}})()`;
