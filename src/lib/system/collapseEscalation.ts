// src/lib/system/collapseEscalation.ts

import type { Random } from '@/lib/system/lore';

/**
 * Qué pasa cuando alguien rompe el sistema una y otra vez.
 *
 * Las primeras veces el colapso es un espectáculo: se rompe, se reinicia, todo
 * vuelve. Pero si insistís, el sistema deja de tomárselo bien — tarda más en
 * volver, falla más fuerte, y a la décima vez seguida ya no vuelve solo.
 *
 * La idea es que romper algo tenga consecuencias crecientes SIN que nunca se
 * pierda nada: el editor sigue montado debajo de todo esto y el auto-guardado
 * sigue su curso. Lo único que se degrada es la pantalla.
 *
 * Módulo puro: la cuenta y el reloj llegan por parámetro.
 */

/** Cuánto dura la racha. Fuera de esta ventana, la cuenta vuelve a empezar. */
export const ESCALATION_WINDOW_MS = 5 * 60_000;

/**
 * A cuántas veces seguidas el sistema deja de reiniciarse.
 *
 * SEIS, y el número importa. Con diez el escalón era INALCANZABLE: los
 * rearranques ocurren dentro de la ventana, y con 10–40 s cada uno más la
 * escalada, llegar a diez consumía más de seis minutos sólo en pantallas de
 * carga — la ventana de cinco se cerraba antes. Nadie podía llegar nunca.
 *
 * Cinco tampoco: deja dos reproducciones limpias y dos escalones, y la escalada
 * no llega a sentirse. Seis da dos limpias, dos intermedias, una fuerte y el
 * bloqueo — la progresión completa, y alcanzable a mano.
 */
export const LOCKOUT_AT = 6;

/** Cuánto dura el bloqueo si no resolvés el puzzle. */
export const LOCKOUT_MS = 5 * 60_000;

/**
 * El rearranque normal: entre ocho y veinticinco segundos.
 *
 * Bajado desde 10–40. Cuarenta segundos de pantalla de carga se hacían largos
 * de verdad —y además comían la ventana de la escalada, ver LOCKOUT_AT—; con
 * veinticinco sigue siendo una espera incómoda, que es lo que tiene que ser, sin
 * volverse un castigo.
 */
const REBOOT_MIN_MS = 8000;
const REBOOT_MAX_MS = 25_000;

export interface CollapseLevel {
    /** Cuánto tarda el sistema en volver. */
    rebootMs: number;
    /** Cuánto se multiplica la fuerza de los fallos. */
    intensity: number;
    /** Si el sistema ya no vuelve solo. */
    lockout: boolean;
}

/**
 * La cuenta después de un colapso nuevo.
 *
 * `previous` es la cuenta anterior (o null si no había), `lastAt` **cuándo se
 * RECUPERÓ** el anterior y `now` el instante de éste.
 *
 * SE MIDE DESDE LA RECUPERACIÓN, no desde el colapso anterior, y ese detalle era
 * un defecto de bulto: los rearranques ocurren dentro de la ventana, así que
 * contarlos castigaba al usuario porque la máquina tarda en volver, en vez de
 * porque insistió. La escalada es sobre insistir — sobre lo rápido que volvés a
 * romperlo una vez que se recuperó.
 *
 * Si pasó más de la ventana, la racha se corta: alguien que rompe el sistema una
 * vez por semana no debería encontrarse la pantalla bloqueada.
 */
export function countAfter(
    previous: number | null,
    recoveredAt: number | null,
    now: number
): number {
    if (previous === null) return 1;

    // Sin recuperación desde el colapso anterior, seguís dentro del mismo
    // episodio: romperlo OTRA VEZ antes de que volviera es el caso más
    // insistente que hay, y cortarle la racha ahí sería exactamente al revés.
    if (recoveredAt === null) return previous + 1;

    if (now - recoveredAt >= ESCALATION_WINDOW_MS) return 1;
    return previous + 1;
}

/**
 * Los escalones.
 *
 * Las DOS primeras veces se reproduce igual: el efecto tiene que poder verse un
 * par de veces sin castigo, o nadie llegaría a conocerlo entero. A partir de la
 * tercera, a la máquina empieza a costarle.
 *
 *   1–2   normal, 8–25 s
 *   3–4   +8 s y fallos ×1,5
 *   5     +20 s y fallos ×2
 *   6     bloqueo
 */
const STEPS: readonly { from: number; extraMs: number; intensity: number }[] = [
    { from: 5, extraMs: 20_000, intensity: 2 },
    { from: 3, extraMs: 8000, intensity: 1.5 },
    { from: 1, extraMs: 0, intensity: 1 },
];

export function levelFor(count: number, random: Random = Math.random): CollapseLevel {
    if (count >= LOCKOUT_AT) {
        return {
            // No hay rearranque: la pantalla de error se queda hasta que la
            // resuelvas o hasta que pasen cinco minutos.
            rebootMs: 0,
            intensity: 3,
            lockout: true,
        };
    }

    const step = STEPS.find((s) => count >= s.from) ?? STEPS[STEPS.length - 1];
    const base = REBOOT_MIN_MS + random() * (REBOOT_MAX_MS - REBOOT_MIN_MS);

    return {
        rebootMs: Math.round(base + step.extraMs),
        intensity: step.intensity,
        lockout: false,
    };
}
