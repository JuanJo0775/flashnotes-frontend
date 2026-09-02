// src/lib/system/dropped.ts

/**
 * Lo que la v0.2 no llegó a guardar.
 *
 * A veces no guarda de verdad — es una versión antigua con errores, y una que
 * nunca falla de verdad no da miedo, da risa. Pero **perder para siempre y sin
 * aviso no** : eso sigue siendo la primera regla del proyecto.
 *
 * Así que lo que se cae aquí queda, y `//recover` lo devuelve.
 *
 * EN MEMORIA Y NO EN ALMACENAMIENTO, a propósito. Guardar en `localStorage` lo
 * que el servidor no aceptó sería montar una segunda base de datos por la puerta
 * de atrás: dos sitios con tu texto y ninguna forma de saber cuál manda. Esto es
 * una red de la sesión, no un almacén.
 */

export interface Dropped {
    id: string;
    title: string;
    content: string;
    at: number;
}

/** El último por nota: lo que importa es no perder la versión más reciente. */
const caidas = new Map<string, Dropped>();

export function rememberDropped(id: string, title: string, content: string) {
    caidas.set(id, { id, title, content, at: Date.now() });
}

export function droppedFor(id: string): Dropped | null {
    return caidas.get(id) ?? null;
}

export function allDropped(): Dropped[] {
    return [...caidas.values()];
}

export function forgetDropped(id: string) {
    caidas.delete(id);
}

/** Lo usan `//reset` y los tests. */
export function clearDropped() {
    caidas.clear();
}
