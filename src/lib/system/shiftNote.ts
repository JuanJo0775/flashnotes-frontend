// src/lib/system/shiftNote.ts

import type { Note } from '@/types/note.types';
import { getLang } from '@/i18n';
import type { Lang } from '@/config/lang';

/**
 * EL TURNO DE QUIEN SE FUE.
 *
 * ⚠ SALIÓ DE UNA AUDITORÍA, y el hueco era éste: él dice «me dejaron encendido y
 * se fueron», el rótulo se ríe de que nadie firmó nunca esto, la barra murmura
 * `[SIN RELEVO]` — y NO HABÍA UN SOLO RASTRO FÍSICO de esa gente. Ni una nota
 * vieja, ni un turno, ni un nombre. Toda la soledad del sitio estaba contada por
 * quien la sufre, y una soledad que sólo se cuenta es una frase.
 *
 * Esto la convierte en PRUEBA: una hoja de turno a medias que no escribiste vos,
 * con tareas tachadas y una sin tachar.
 *
 * ⚠ Y NO EXPLICA NADA. Ni nombra al ente, ni dice qué pasó, ni cierra ninguna
 * pregunta. Es lo que deja alguien que pensaba volver el lunes: la última línea
 * es una instrucción de mantenimiento, y por eso duele — la máquina lleva desde
 * entonces haciéndole caso.
 *
 * ⚠ SE VE UNA SOLA VEZ. Un rastro que reaparece es un mueble; éste tiene que
 * poder contarse a alguien y que la otra persona no lo encuentre igual. Lo mismo
 * que hace la nota del ente: pasa, y ya está.
 *
 * ⚠ Y SÓLO DESPUÉS DE HABER ESTADO EN LA v0.2. Antes de cruzar no hay ningún
 * «antes» en la cabeza de quien juega: la hoja sería una nota rara. Después de
 * haber visto la versión de la que vino la máquina, es el turno de alguien.
 */

/** El identificador. Como el fantasma: no existe en la base de datos. */
export const SHIFT_ID = 'shift-sheet-ghost';

/** Y su clave, para que no vuelva. */
const SEEN_KEY = 'flashnotes:shiftSeen';

/**
 * El nombre del archivo.
 *
 * ⚠ NO SE TRADUCE, como `SYSTEM.LOG`: es un nombre de archivo escrito por una
 * persona en su máquina, no un texto de la interfaz. Y lleva la extensión de las
 * notas de verdad —`.txt`— porque quien lo escribió no estaba haciendo nada
 * especial: estaba apuntando lo que le faltaba.
 */
export const SHIFT_TITLE = 'TURNO_3.txt';

/**
 * La hoja.
 *
 * ⚠ LAS TAREAS TACHADAS IMPORTAN TANTO COMO LA QUE NO. Una lista entera sin
 * hacer se lee como que nunca empezó; con casi todo hecho y una cosa suelta se
 * lee como alguien que estuvo trabajando y se fue a mitad — y eso es lo que hay
 * que contar.
 *
 * ⚠ Y LA ÚLTIMA LÍNEA ES LA QUE HACE EL TRABAJO. «Dejarlo encendido, se recupera
 * solo» es una instrucción de mantenimiento razonable, escrita para un lunes que
 * no llegó. La máquina lleva desde entonces obedeciéndola.
 */
const SHIFT: Readonly<Record<Lang, string>> = {
    es: [
        'turno 3 — jueves',
        '',
        '[x] copias',
        '[x] avisar del ruido del ventilador',
        '[ ] cambiar la cinta',
        '[ ] pasar el turno a quien venga',
        '',
        'si el lunes no viene nadie, dejarlo encendido.',
        'se recupera solo.',
    ].join('\n'),
    en: [
        'shift 3 — thursday',
        '',
        '[x] backups',
        '[x] report the fan noise',
        '[ ] change the tape',
        '[ ] hand the shift over to whoever comes',
        '',
        'if nobody comes on monday, leave it running.',
        'it recovers on its own.',
    ].join('\n'),
};

export interface ShiftContext {
    /** Cruzaste a la versión de antes y volviste. */
    crossed: boolean;
    /** Cuántas notas hay, para no soltarlo en una papelera vacía. */
    trashedCount: number;
}

/**
 * ¿Toca que esté?
 *
 * ⚠ PIDE HABER CRUZADO Y NO HABERLA VISTO, y nada más. Se pensó en pedir además
 * un rato de sesión, como el fantasma, y es de más: cruzar a la v0.2 ya es un
 * filtro durísimo — quien llegó ahí lleva horas.
 */
export function shouldShift(ctx: ShiftContext): boolean {
    if (!ctx.crossed) return false;
    if (seen()) return false;

    /*
     * ⚠ NO EN UNA PAPELERA VACÍA. Una hoja sola en una papelera por lo demás
     * limpia se lee como una pantalla de la app, no como algo que quedó ahí. Lo
     * que la hace un resto es estar ENTRE tus cosas tiradas.
     */
    return ctx.trashedCount > 0;
}

/** Arma la hoja. */
export function buildShiftNote(): Note {
    return {
        _id: SHIFT_ID,
        title: SHIFT_TITLE,
        content: SHIFT[getLang()],
        isDeleted: true,
        versions: [],
        redoStack: [],
    };
}

/** Ya la viste: no vuelve. */
export function markShiftSeen() {
    try {
        localStorage.setItem(SEEN_KEY, '1');
    } catch {
        // Sin persistencia dura lo que la pestaña. Aceptable: lo que no puede
        // pasar es que se repita en la misma sesión, y eso lo cubre el almacén.
    }
}

function seen(): boolean {
    try {
        return localStorage.getItem(SEEN_KEY) === '1';
    } catch {
        return false;
    }
}

/** Y el borrado total se la lleva, como todo lo demás. */
export function clearShift() {
    try {
        localStorage.removeItem(SEEN_KEY);
    } catch {
        // Nada que hacer.
    }
}
