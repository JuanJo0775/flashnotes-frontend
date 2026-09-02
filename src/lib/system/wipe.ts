// src/lib/system/wipe.ts

/**
 * El borrado, de principio a fin.
 *
 * No es un cartel encima de la app: es una SECUENCIA, y cada tramo tiene un
 * trabajo distinto.
 *
 *   1 · `fading`  — la pantalla de notas se desvanece hasta quedar vacía.
 *   2 · `erasing` — pantalla aparte, contando lo que se va yendo.
 *   3 · `off`     — pum: el tubo se apaga, como cuando cortás la corriente.
 *   4 · `bars`    — las franjas de color, con el equipo ya sin nada dentro.
 *   5 · el monitor vuelve a encenderse, y a casa.
 *
 * Las franjas van DESPUÉS del apagón y no antes. Es la diferencia entre «se
 * apagó» y «se apagó y volvió a encenderse desde cero»: lo que se ve entre las
 * dos cosas es un equipo sin señal, que es exactamente lo que hay cuando ya no
 * queda nada dentro.
 *
 * El desvanecido es lo que la hace funcionar. Sin él, la pantalla de borrado
 * aparecía de golpe sobre las notas y se leía como un diálogo; con él, lo que se
 * ve es a la app IRSE, y sólo después empieza a contarse.
 *
 * ⚠ ESTO BORRA DE VERDAD, Y BORRA TODO — notas incluidas.
 *
 * Es la única operación irreversible de la app y la única que toca el servidor.
 * Por eso el aviso lo dice con todas las letras antes de preguntar, y por eso la
 * pregunta existe.
 *
 * LA BROMA se sale por otro lado: `fading`, `erasing`, y en vez de apagarse
 * suelta un «era broma» y devuelve a casa sin haber tocado nada. Es la única
 * forma de que decir que NO no sea siempre la respuesta aburrida.
 */

/** El desvanecido de la app. Lo bastante lento para verse, no para aburrir. */
export const WIPE_FADE_MS = 900;

/** Cada cuánto se come una línea. */
export const WIPE_STEP_MS = 220;

/** El apagón del tubo. Va con la misma animación que el colapso. */
export const WIPE_OFF_MS = 420;

/** Las franjas, con el equipo ya vacío. Cortas: es un latido, no una parada. */
export const WIPE_BARS_MS = 700;

/** Cuánto se queda el «era broma» antes de devolverte a casa. */
export const WIPE_JOKE_MS = 2200;

/** Cada cuánto un «no» resulta ser una broma. */
export const PRANK_ODDS = 0.2;

/**
 * Lo que se ve yéndose.
 *
 * Nombres de cosas de la casa, no palabras de relleno: lo que da el escalofrío
 * es reconocer lo que se está borrando. Las notas van LAS PRIMERAS porque son lo
 * que de verdad importa, y verlas encabezar la lista es el aviso final.
 */
const LINEAS = [
    'notas/*',
    'notas/papelera',
    'secrets.idx',
    'art/collected',
    'art/found',
    'coleccion',
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
    | { kind: 'fading' }
    | { kind: 'erasing'; lines: string[]; eaten: number }
    | { kind: 'off' }
    | { kind: 'bars' }
    | { kind: 'joke' }
    | { kind: 'done' };

/** Cuántos pasos dura comerse las líneas. */
export const WIPE_STEPS = LINEAS.length;

/**
 * Qué se ve en el paso `n`.
 *
 * El paso 0 es el desvanecido; de ahí en adelante, una línea por paso. Después
 * se bifurca: la de verdad apaga el tubo, la broma confiesa.
 */
export function wipeAt(step: number, prank = false): WipePhase {
    if (step <= 0) return { kind: 'fading' };

    const comiendo = step - 1;

    if (comiendo < WIPE_STEPS) {
        return { kind: 'erasing', lines: LINEAS, eaten: comiendo };
    }

    if (comiendo === WIPE_STEPS) return prank ? { kind: 'joke' } : { kind: 'off' };

    // La broma no se apaga ni enseña franjas: no hay nada que apagar cuando no
    // se borró nada, y volver por el arranque diría que sí pasó algo.
    if (comiendo === WIPE_STEPS + 1 && !prank) return { kind: 'bars' };

    return { kind: 'done' };
}

/** Cuánto dura el tramo que se ve en el paso `n`. */
export function wipeDuration(step: number, prank = false): number {
    const fase = wipeAt(step, prank);

    switch (fase.kind) {
        case 'fading':
            return WIPE_FADE_MS;
        case 'erasing':
            return WIPE_STEP_MS;
        case 'off':
            return WIPE_OFF_MS;
        case 'bars':
            return WIPE_BARS_MS;
        case 'joke':
            return WIPE_JOKE_MS;
        default:
            return 0;
    }
}

/**
 * Cómo se pinta una línea según le haya tocado o no.
 *
 * La comida no desaparece: se sustituye por basura del mismo largo. Un hueco en
 * blanco se lee como una lista más corta; una fila de ruido se lee como algo que
 * estaba ahí y ya no.
 *
 * ⚠ EL PREFIJO MIDE LO MISMO EN LOS DOS CASOS. Con `  ` y `xx ` la línea crecía
 * un carácter al comerse, y en una rejilla de monoespaciada eso empuja todo lo
 * de al lado: el borrado se leía como un fallo de maquetación en vez de como
 * algo devorándose la pantalla.
 */
export function wipeLine(nombre: string, comida: boolean): string {
    if (!comida) return `   ${nombre}`;

    return `xx ${'#'.repeat(nombre.length)}`;
}

/** Si este «no» es de los que gastan una broma. */
export function isPrank(rand: () => number = Math.random): boolean {
    return rand() < PRANK_ODDS;
}
