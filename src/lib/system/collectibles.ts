// src/lib/system/collectibles.ts

/**
 * Qué notas no son notas.
 *
 * Una pieza guardada con `//keep` vive en la misma colección del backend que
 * todo lo demás —no hay otro sitio donde ponerla— pero **no es una nota tuya**:
 * no la escribiste, no se edita, y no tiene por qué estorbar entre tus archivos.
 * Va en su propia sección.
 *
 * ⚠ LA MARCA VIVE EN EL NAVEGADOR, no en el backend, y es una decisión: el
 * backend no se toca para un efecto (REGLAS · B4). Un campo nuevo en el modelo,
 * una migración y un endpoint por un huevo de pascua es exactamente el tipo de
 * cambio que esta regla existe para frenar.
 *
 * El precio es honesto y hay que decirlo: **abrir la app desde otro navegador
 * enseña las piezas como notas normales**. Lo mismo que ya pasa con la colección
 * de `//art` y con los marcadores del pong — todo el juego es de este navegador.
 */

const STORAGE_KEY = 'flashnotes:collectibles';

let cache: Set<string> | null = null;

export function readCollectibles(): Set<string> {
    if (cache) return cache;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return (cache = new Set());

        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return (cache = new Set());

        return (cache = new Set(parsed.filter((id): id is string => typeof id === 'string')));
    } catch {
        return (cache = new Set());
    }
}

/** Marca una nota como pieza de la colección. */
export function markCollectible(id: string) {
    const ids = readCollectibles();
    if (ids.has(id)) return;

    ids.add(id);
    cache = ids;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
        // Sin sitio: la pieza queda como una nota más. Se ve igual, sólo que en
        // la sección equivocada.
    }
}

export function isCollectible(id: string): boolean {
    return readCollectibles().has(id);
}

/**
 * La deja de considerar pieza.
 *
 * Se llama al mandarla a la papelera: una vez tirada ya no está en la
 * colección, y si la restaurás vuelve como lo que es ahora — una nota.
 */
export function forgetCollectible(id: string) {
    const ids = readCollectibles();
    if (!ids.delete(id)) return;

    cache = ids;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
        // Nada que hacer.
    }
}

/** Lo usan `//reset` y los tests. */
export function clearCollectibles() {
    cache = null;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nada que hacer.
    }
}

/** Reparte una lista de notas entre las tuyas y las de la colección. */
export function splitCollectibles<T extends { _id: string }>(
    notes: readonly T[]
): { notes: T[]; collectibles: T[] } {
    const ids = readCollectibles();

    return {
        notes: notes.filter((n) => !ids.has(n._id)),
        collectibles: notes.filter((n) => ids.has(n._id)),
    };
}
