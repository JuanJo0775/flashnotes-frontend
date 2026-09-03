// src/lib/system/glitchTiming.ts

import type { Random } from '@/lib/system/lore';

/**
 * Cada cuánto falla la máquina, y con qué fuerza.
 *
 * Todo puro, para que el temporizador del glitch no tenga que probarse montando
 * la app. Quien lo llama le pasa el tiempo de sesión y la integridad.
 */

const MINUTO = 60_000;

/**
 * Escalones de fatiga. Cuanto más lleva abierta la pestaña, más seguido falla.
 *
 * No es decoración estadística: la app de verdad lleva la cuenta de tu sesión y
 * de verdad la usa para esto. Es la forma más barata que tiene el lore de ser
 * cierto — la máquina se cansa mientras la usás.
 */
const FATIGUE: readonly { fromMs: number; baseMs: number; jitterMs: number }[] = [
    { fromMs: 90 * MINUTO, baseMs: 90_000, jitterMs: 20_000 },
    { fromMs: 45 * MINUTO, baseMs: 120_000, jitterMs: 30_000 },
    { fromMs: 10 * MINUTO, baseMs: 180_000, jitterMs: 45_000 },
    { fromMs: 0, baseMs: 240_000, jitterMs: 60_000 },
];

/** Por debajo de esto no se programa nada: sería acoso, no ambiente. */
const FLOOR_MS = MINUTO;

/** Cuánto falta para el próximo glitch, dada la duración de la sesión. */
export function glitchIntervalMs(
    sessionMs: number,
    random: Random = Math.random
): number {
    const turno = Math.max(0, sessionMs);
    const escalon = FATIGUE.find((f) => turno >= f.fromMs) ?? FATIGUE[FATIGUE.length - 1];

    // El jitter va de -jitter a +jitter: la franja completa, centrada en base.
    const desvio = (random() * 2 - 1) * escalon.jitterMs;

    return Math.max(FLOOR_MS, Math.round(escalon.baseMs + desvio));
}

/**
 * Cuánto tiembla la pantalla, en píxeles.
 *
 * 3px es el temblor en reposo, con el sistema sano. Baja la integridad (§5) y
 * sube: es la misma señal contada más fuerte, no una señal distinta.
 */
export function glitchAmplitudePx(integrity: number): number {
    if (integrity >= 100) return 3;
    if (integrity >= 80) return 3;
    if (integrity >= 60) return 5;
    if (integrity >= 40) return 7;
    return 10;
}

/** Una de cada cuatro veces el glitch va con negativo. */
export const NEGATIVE_ODDS = 4;

/**
 * Una de cada cinco veces, el glitch va acompañado de un fragmento del sistema.
 *
 * Este acoplamiento es el mecanismo central del lore: un fallo suelto es ruido,
 * un fallo que ocurre justo cuando el sistema dice algo es una frase. El glitch
 * te hace levantar la vista y lo que leés cuando la levantás es el fragmento.
 */
export const FRAGMENT_ODDS = 5;

export function rollsNegative(random: Random = Math.random): boolean {
    return random() < 1 / NEGATIVE_ODDS;
}

export function rollsFragment(random: Random = Math.random): boolean {
    return random() < 1 / FRAGMENT_ODDS;
}

/**
 * La gravedad de un fallo.
 *
 * Un glitch que siempre es igual deja de ser un fallo y pasa a ser un bucle: a
 * la tercera vez el ojo lo reconoce y lo descarta. Con tres niveles y pesos muy
 * desparejos, la mayoría de las veces apenas parpadea y muy de vez en cuando la
 * señal se cae entera — y esa rareza es lo que hace que la grave valga.
 */
export type GlitchSeverity = 'minor' | 'major' | 'severe';

/** 70 % leve · 25 % serio · 5 % grave. */
export function rollSeverity(random: Random = Math.random): GlitchSeverity {
    const r = random();
    if (r < 0.7) return 'minor';
    if (r < 0.95) return 'major';
    return 'severe';
}

/**
 * Una franja horizontal de la pantalla, desplazada de lado.
 *
 * Es el efecto que más "señal rota" comunica de todos: la imagen se parte en
 * bandas y cada una se corre por su cuenta. Las posiciones se calculan acá,
 * puras, y la capa sólo las pinta.
 */
export interface GlitchSlice {
    /** Dónde empieza, en porcentaje de la altura. */
    topPct: number;
    /** Cuánto mide de alto, en porcentaje. */
    heightPct: number;
    /** Cuánto se corre de lado, en píxeles. Negativo es a la izquierda. */
    shiftPx: number;
}

const SLICES: Record<GlitchSeverity, number> = {
    minor: 0,
    major: 3,
    severe: 6,
};

/** Cuántas rebanadas le tocan a cada nivel. */
export function sliceCount(severity: GlitchSeverity): number {
    return SLICES[severity];
}

/** Cuánto puede correrse una rebanada, según la gravedad. */
const MAX_SHIFT_PX: Record<GlitchSeverity, number> = {
    minor: 0,
    major: 14,
    severe: 34,
};

export function buildSlices(
    severity: GlitchSeverity,
    random: Random = Math.random
): GlitchSlice[] {
    const cuantas = sliceCount(severity);
    const maxShift = MAX_SHIFT_PX[severity];

    return Array.from({ length: cuantas }, (_, i) => {
        // Se reparten por bandas para que no se amontonen todas arriba: cada una
        // vive en su franja y se mueve sólo dentro de ella.
        const banda = 100 / cuantas;
        const topPct = Math.min(99, i * banda + random() * banda * 0.6);

        // De 1,5 % a 7 % de alto: una rebanada demasiado gruesa deja de leerse
        // como un corte de señal y parece que la interfaz se partió en dos.
        const heightPct = 1.5 + random() * 5.5;

        // El azar centrado en cero: se corren a los dos lados, nunca sólo a uno.
        const shiftPx = Math.round((random() * 2 - 1) * maxShift) || -1;

        return { topPct, heightPct, shiftPx };
    });
}
