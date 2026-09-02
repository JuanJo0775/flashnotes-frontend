// src/lib/system/ghostFile.ts

import type { Note } from '@/types/note.types';
import { getLang } from '@/i18n';

/**
 * SYSTEM.LOG: la nota que aparece en la papelera y que nadie creó.
 *
 * SÓLO EXISTE EN EL CLIENTE. No toca la base de datos, y eso no es cobardía: su
 * contenido es tiempo de sesión y peticiones de ESTA pestaña, o sea información
 * que nace y muere con ella. Una nota que dice "sesión iniciada" y sigue ahí
 * tres días después no sería más convincente — sería incoherente, y encima de
 * una forma detectable. Un log de sesión que sobrevive a la sesión es mentira.
 *
 * Su contenido es el registro REAL de peticiones (ver requestLog.ts). Un archivo
 * fantasma que te muestra algo verificable es incomparablemente más incómodo que
 * uno que lo simula.
 *
 * Se distingue siempre: lleva etiqueta [SISTEMA] en vez de [ELIMINADA]. Es un
 * chiste, no una trampa.
 */

/**
 * Su identificador.
 *
 * A propósito NO es un ObjectId de 24 hexadecimales: así, si algún día alguien
 * se descuida y lo pasa a una llamada de la API, el validador de ids lo rechaza
 * antes de que salga a la red en lugar de mandar basura al servidor.
 */
export const GHOST_ID = 'system-log-ghost';

export const GHOST_TITLE = 'SYSTEM.LOG';

/** Cuánto tiene que llevar abierta la sesión para que aparezca. */
export const GHOST_MIN_SESSION_MS = 10 * 60_000;

/** Cuántas notas tuyas tiene que haber. */
export const GHOST_MIN_NOTES = 3;

/** Cuánto tarda en volver después de que lo borres. */
export const GHOST_RETURN_MS = 5 * 60_000;

export interface GhostContext {
    sessionMs: number;
    notesCount: number;
    /** Cuándo lo borraste, o null si nunca. */
    dismissedAt: number | null;
    now: number;
}

/**
 * ¿Toca que esté?
 *
 * Se pregunta cada vez que se mira la papelera, no cada tanto por reloj. La
 * primera versión lo hacía volver "entre 5 y 15 minutos después", y eso no se
 * cobra nunca: entrás a la papelera, borrás, salís, y no volvés en toda la
 * sesión. Atado a la visita, el chiste sí se ve.
 */
export function shouldHaunt(ctx: GhostContext): boolean {
    if (ctx.sessionMs < GHOST_MIN_SESSION_MS) return false;
    if (ctx.notesCount < GHOST_MIN_NOTES) return false;

    if (ctx.dismissedAt !== null && ctx.now - ctx.dismissedAt < GHOST_RETURN_MS) {
        return false;
    }

    return true;
}

/** Arma la nota fantasma con el registro de peticiones dentro. */
export function buildGhostNote(log: string): Note {
    // `SYSTEM.LOG` no se traduce: es un nombre de archivo. El cuerpo sí — es la
    // máquina hablando, y habla en el idioma en que la estás leyendo.
    const es = getLang() === 'es';
    const cuerpo =
        log.trim().length > 0
            ? log
            : es
              ? 'SIN ACTIVIDAD REGISTRADA EN ESTE TURNO.'
              : 'NO ACTIVITY LOGGED ON THIS SHIFT.';

    return {
        _id: GHOST_ID,
        title: GHOST_TITLE,
        content: [
            es ? '// REGISTRO DE SESIÓN' : '// SESSION LOG',
            es
                ? '// ESTE ARCHIVO NO LO ESCRIBIÓ USTED.'
                : '// YOU DID NOT WRITE THIS FILE.',
            '',
            cuerpo,
        ].join('\n'),
        isDeleted: true,
        versions: [],
        redoStack: [],
    };
}
