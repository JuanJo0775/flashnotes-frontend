// src/lib/system/v02Notes.ts

/**
 * Los archivos de la v0.2.
 *
 * **Son otros.** Entrar por primera vez encuentra la versión VACÍA, y lo que
 * escribas ahí no aparece en la v1.0 ni al revés. Son dos versiones distintas del
 * mismo programa, y cada una tiene lo suyo.
 *
 * POR QUÉ EN EL NAVEGADOR Y NO EN EL BACKEND. Porque el backend no se toca para
 * un efecto (REGLAS · B4) — pero además es lo que de verdad cuenta la historia:
 * la v0.2 guardaba sus cosas en otro sitio, nadie migró nada, y por eso siguen
 * ahí sin que la versión nueva las vea.
 *
 * El precio, dicho claro: **lo que escribas en la v0.2 vive sólo en este
 * navegador**. Igual que la colección de piezas y los marcadores del pong.
 */

import type { Note } from '@/types/note.types';

const STORAGE_KEY = 'flashnotes:v02notes';

let cache: Note[] | null = null;

/*
 * ALMACÉN DE MÓDULO, como el resto del estado compartido de la app.
 *
 * El primer intento pasaba un contador de versión por las dependencias de un
 * `useMemo` para forzar la relectura. Funcionaba, pero es un apaño: el
 * compilador de React no puede ver que `readV02Notes()` dependa de ese número, y
 * lo avisó. Suscribirse es lo correcto y además hace que cualquier sitio que
 * pinte estas notas se entere solo (REGLAS · B2).
 */
const listeners = new Set<() => void>();

/** Referencia constante: si cambiara en cada lectura, el hook entraría en bucle. */
const VACIO: Note[] = [];

export function subscribeV02Notes(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getV02NotesSnapshot(): Note[] {
    return cache ?? readV02Notes();
}

export function getV02NotesServerSnapshot(): Note[] {
    return VACIO;
}

/** Un identificador con la misma pinta que los del backend, para que encaje. */
function nuevoId(): string {
    const hex = '0123456789abcdef';
    let out = '';
    for (let i = 0; i < 24; i += 1) out += hex[Math.floor(Math.random() * 16)];
    return out;
}

function esNota(v: unknown): v is Note {
    if (typeof v !== 'object' || v === null) return false;
    const n = v as Partial<Note>;
    return typeof n._id === 'string' && typeof n.content === 'string';
}

export function readV02Notes(): Note[] {
    if (cache) return cache;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return (cache = []);

        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return (cache = []);

        return (cache = parsed.filter(esNota));
    } catch {
        return (cache = []);
    }
}

function guardar(notas: Note[]) {
    cache = notas;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
    } catch {
        // Sin sitio: la v0.2 se olvida al recargar. Es coherente con lo que es.
    }
    listeners.forEach((l) => l());
}

/** Crea un archivo de la v0.2. */
export function createV02Note(title: string): Note {
    const ahora = new Date().toISOString();
    const nota = {
        _id: nuevoId(),
        title,
        content: '',
        createdAt: ahora,
        updatedAt: ahora,
    } as Note;

    // Las más nuevas primero, como en la lista de verdad.
    guardar([nota, ...readV02Notes()]);
    return nota;
}

/** Guarda un archivo de la v0.2. Devuelve `null` si ya no existe. */
export function saveV02Note(
    id: string,
    data: { title?: string; content?: string }
): Note | null {
    const notas = readV02Notes();
    const i = notas.findIndex((n) => n._id === id);
    if (i < 0) return null;

    const actualizada = {
        ...notas[i],
        ...(data.title === undefined ? null : { title: data.title }),
        ...(data.content === undefined ? null : { content: data.content }),
        updatedAt: new Date().toISOString(),
    } as Note;

    const siguientes = [...notas];
    siguientes[i] = actualizada;
    guardar(siguientes);

    return actualizada;
}

/** Lo usan `//reset` y los tests. */
export function clearV02Notes() {
    cache = null;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nada que hacer.
    }
    listeners.forEach((l) => l());
}
