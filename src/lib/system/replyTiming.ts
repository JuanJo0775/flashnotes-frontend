// src/lib/system/replyTiming.ts

/**
 * Con qué ritmo se teclea y cuánto se queda la respuesta de un comando.
 *
 * Vive aparte del editor porque es lógica pura y se prueba entera sin montar
 * nada — la misma razón por la que la física del pong o los fragmentos del lore
 * no viven dentro de su componente.
 *
 * MÁS RÁPIDO QUE EL ARRANQUE: el arranque es la máquina despertando, esto es la
 * máquina contestando algo que le preguntaste, y una terminal contesta rápido.
 *
 * EL RITMO SE ADAPTA AL LARGO, y hace falta. Con 18 ms fijos por carácter, la
 * lista de `//help` —más de cuatrocientos caracteres— tardaba OCHO SEGUNDOS en
 * aparecer y catorce en cerrar su arco: imposible de usar. Sólo se notó usando
 * la app.
 */

const TYPE_MS = 18;
const TYPE_TOTAL_MS = 1200;
const HOLD_BASE_MS = 2000;
const HOLD_PER_CHAR_MS = 22;
const HOLD_MAX_MS = 9000;
const ERASE_TOTAL_MS = 500;
const ERASE_MAX_MS = 8;

/**
 * Lo que aguanta una respuesta LARGA antes de irse.
 *
 * Fijo y generoso en vez de proporcional: lo que hace falta no es leer más
 * caracteres, es tener margen para desplazarla hasta el final y volver.
 */
export const HOLD_LONG_MS = 32_000;

/**
 * A partir de cuántas líneas una respuesta se considera larga.
 *
 * TODAS SE BORRAN SOLAS, incluidas éstas: que la terminal se limpie y te deje la
 * nota en blanco es parte de cómo se siente, y una respuesta que hay que cerrar
 * a mano es una molestia. Lo que cambia con el largo es cuánto se queda.
 */
export const LONG_REPLY_LINES = 6;

export function isLongReply(text: string): boolean {
    return text.split('\n').length > LONG_REPLY_LINES;
}

export interface ReplyTimings {
    typeMs: number;
    holdMs: number;
    eraseMs: number;
}

/** Los tiempos que le tocan a esta respuesta. */
export function replyTimings(text: string): ReplyTimings {
    const chars = Math.max(1, text.length);

    return {
        typeMs: Math.min(TYPE_MS, TYPE_TOTAL_MS / chars),
        holdMs: isLongReply(text)
            ? HOLD_LONG_MS
            : Math.min(HOLD_MAX_MS, HOLD_BASE_MS + chars * HOLD_PER_CHAR_MS),
        eraseMs: Math.min(ERASE_MAX_MS, ERASE_TOTAL_MS / chars),
    };
}
