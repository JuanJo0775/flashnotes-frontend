// src/config/theme.ts

/**
 * Constantes del tema, en un módulo SIN `'use client'`.
 *
 * Esto no es un detalle de organización: `layout.tsx` es un Server Component y
 * necesita el valor real de la clave para generar el script de arranque. Si se
 * importa desde un módulo marcado `'use client'`, el servidor recibe una
 * referencia al cliente y no el valor — el script salía con
 * `localStorage.getItem(undefined)` y el tema guardado no se aplicaba nunca.
 */

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'flashnotes-theme';

/**
 * Script que aplica el tema guardado ANTES del primer pintado.
 *
 * Sin esto la página se pinta con el tema del sistema y salta al elegido al
 * hidratar: un fogonazo blanco si abrís en modo oscuro. Va en línea y síncrono
 * a propósito.
 *
 * Si no hay elección guardada no estampa nada, para que siga mandando
 * `prefers-color-scheme`.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;
