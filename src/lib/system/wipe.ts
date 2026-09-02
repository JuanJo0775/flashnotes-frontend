// src/lib/system/wipe.ts

/**
 * El borrado, visto por dentro.
 *
 * No es una barra de progreso: es una pantalla que se COME a sí misma. Las
 * líneas se van tachando y desapareciendo, el hueco se queda vacío, salen tres
 * puntos, y vuelve el inicio como si acabaras de abrir la app.
 *
 * Todo el guion vive acá, puro y probado. El componente sólo lo reproduce.
 *
 * ⚠ LA BROMA. Contestar «no» tiene una probabilidad pequeña de enseñar el mismo
 * borrado, entero, y rematar con un «era broma» — sin haber tocado nada. Es la
 * única forma de que decir que NO también tenga premio, y funciona porque para
 * entonces ya viste la pantalla de verdad o creés que la estás viendo.
 *
 * Y sólo pasa con el «no». Con el «sí» no hay sorteo: pedir que borre y que a
 * veces no borre sería una app que no hace lo que le pedís.
 */

/** Cada cuánto se come una línea. */
export const WIPE_STEP_MS = 90;

/** Cuánto se queda la pantalla vacía antes de los tres puntos. */
export const WIPE_BLANK_MS = 500;

/** Cuánto duran los tres puntos. */
export const WIPE_DOTS_MS = 900;

/** Cada cuánto un «no» resulta ser una broma. */
export const PRANK_ODDS = 0.2;

/**
 * Lo que se ve tachándose.
 *
 * Nombres de cosas de la casa, no palabras de relleno: lo que da el escalofrío
 * es reconocer lo que se está yendo.
 */
const LINEAS = [
    'secrets.idx',
    'art/collected',
    'art/found',
    'pong/scores',
    'pong/scores.degraded',
    'commands.used',
    'greetings',
    'v02/flag',
    'v02/notes',
    'v02/trash',
    'session',
];

export type WipePhase =
    | { kind: 'eating'; lines: string[]; eaten: number }
    | { kind: 'blank' }
    | { kind: 'dots' }
    | { kind: 'done' };

/** Cuántos pasos dura el comerse las líneas. */
export const WIPE_STEPS = LINEAS.length;

/**
 * Qué se ve en el paso `n`.
 *
 * Las líneas no se borran de golpe: se quedan puestas y se van marcando como
 * comidas, para que se vea cuántas quedan. Una lista que sólo encoge no da
 * sensación de que algo esté siendo devorado.
 */
export function wipeAt(step: number): WipePhase {
    if (step < WIPE_STEPS) {
        return { kind: 'eating', lines: LINEAS, eaten: Math.max(0, step) };
    }

    if (step === WIPE_STEPS) return { kind: 'blank' };
    if (step === WIPE_STEPS + 1) return { kind: 'dots' };

    return { kind: 'done' };
}

/**
 * Cómo se pinta una línea según le haya tocado o no.
 *
 * La comida no desaparece: se sustituye por basura del mismo largo. Un hueco en
 * blanco se lee como una lista más corta; una fila de ruido se lee como algo
 * que estaba ahí y ya no.
 */
export function wipeLine(nombre: string, comida: boolean): string {
    // ⚠ EL PREFIJO MIDE LO MISMO EN LOS DOS CASOS. Con `  ` y `xx ` la línea
    // crecía un carácter al comerse, y en una rejilla de monoespaciada eso
    // empuja todo lo de al lado: el borrado se leía como un fallo de
    // maquetación en vez de como algo devorándose la pantalla.
    if (!comida) return `   ${nombre}`;

    return `xx ${'#'.repeat(nombre.length)}`;
}

/** Si este «no» es de los que gastan una broma. */
export function isPrank(rand: () => number = Math.random): boolean {
    return rand() < PRANK_ODDS;
}
