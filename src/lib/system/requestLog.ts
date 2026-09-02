// src/lib/system/requestLog.ts

import { getLang } from '@/i18n';
import type { Localized } from '@/i18n';

/**
 * Un `Localized` y no un ternario: al añadir un idioma esto deja de compilar
 * en vez de servir inglés en silencio. Ver `i18n/types.ts`.
 */
const SIN_PETICIONES: Localized = {
    es: 'SIN PETICIONES REGISTRADAS.',
    en: 'NO REQUESTS LOGGED.',
};

/**
 * Registro de las últimas peticiones que hizo el cliente.
 *
 * El backend loguea cada llamada como `[REQUEST] PATCH /notes/:id {sessionHash}`
 * (ver requestLogger.js). El cliente no guardaba nada equivalente, así que la
 * app no tenía forma de contarte lo que ella misma acababa de hacer.
 *
 * Esto es lo que leen `//log` y el archivo fantasma. Su valor está en que NO es
 * decoración: cada línea ocurrió de verdad.
 *
 * QUÉ NO GUARDA: cuerpos de petición ni de respuesta. La regla del proyecto es
 * que el contenido de una nota no se lee, y eso vale también acá. Sólo entran
 * método, ruta, código y duración — y `record` construye la entrada campo por
 * campo justamente para que nada más pueda colarse.
 *
 * Es un búfer circular en memoria: no persiste, no crece y muere con la pestaña.
 */

/** Cuántas peticiones se recuerdan. Más allá de esto se descartan las viejas. */
export const LOG_CAPACITY = 40;

export interface RequestLogEntry {
    at: Date;
    method: string;
    path: string;
    status: number;
    durationMs: number;
}

/** Lo que hace falta para anotar una petición. La hora la pone el registro. */
export type RequestLogInput = Omit<RequestLogEntry, 'at'>;

// Más reciente al final. `entries()` la da vuelta al salir.
let buffer: RequestLogEntry[] = [];

/**
 * Anota una petición.
 *
 * Los campos se copian de uno en uno a propósito: un `{ ...input }` dejaría
 * pasar al registro cualquier cosa que el llamador adjuntara, cuerpos incluidos.
 */
export function record(input: RequestLogInput): void {
    buffer.push({
        at: new Date(),
        method: input.method,
        path: input.path,
        status: input.status,
        durationMs: input.durationMs,
    });

    if (buffer.length > LOG_CAPACITY) buffer.shift();
}

/** Las peticiones anotadas, de la más reciente a la más vieja. */
export function entries(): readonly RequestLogEntry[] {
    return [...buffer].reverse();
}

/** Vacía el registro. */
export function clear(): void {
    buffer = [];
}

/** Un ObjectId de Mongo: 24 caracteres hexadecimales. */
const OBJECT_ID = /\b[0-9a-f]{24}\b/gi;

/**
 * Acorta los identificadores de nota a sus primeros cuatro caracteres.
 *
 * Un ObjectId entero ocupa 24 caracteres y empuja el resto de la línea fuera de
 * la caja; con cuatro alcanza para distinguir una nota de otra, que es lo único
 * que se le pide a esta columna.
 */
function shortenIds(path: string): string {
    return path.replace(OBJECT_ID, (id) => `${id.slice(0, 4)}…`);
}

/** Dos dígitos, hora local del dispositivo. */
function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/**
 * Una línea con el formato del log del servidor.
 *
 * La hora es la LOCAL del dispositivo, no UTC: es la que el usuario tiene en su
 * reloj, y este registro está para que pueda reconocer lo que acaba de hacer.
 * (`formatters.ts` sigue en UTC; esa diferencia es deliberada y es lo que
 * responde el comando `//date`.)
 */
export function formatEntry(entry: RequestLogEntry): string {
    const hora = `${pad(entry.at.getHours())}:${pad(entry.at.getMinutes())}:${pad(
        entry.at.getSeconds()
    )}`;

    const metodo = entry.method.toUpperCase().padEnd(6);
    const ruta = shortenIds(entry.path).padEnd(28);

    return `${hora}  ${metodo}  ${ruta}  ${entry.status}  ${entry.durationMs}ms`;
}

/** El registro entero, una petición por línea. */
export function formatLog(): string {
    if (buffer.length === 0)
        return SIN_PETICIONES[getLang()];
    return entries().map(formatEntry).join('\n');
}
