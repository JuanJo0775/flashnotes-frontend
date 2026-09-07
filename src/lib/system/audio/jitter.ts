// src/lib/system/audio/jitter.ts

/**
 * Que nada suene dos veces igual.
 *
 * La repetición EXACTA es la señal que delata al audio sintético, y el oído la
 * caza al tercer clic. Un objeto real no suena nunca dos veces igual: la tecla
 * no cae siempre con la misma fuerza, el plástico no resuena siempre desde el
 * mismo sitio, el relé no cierra siempre con el mismo empuje.
 *
 * Por eso esto no es un adorno que se añade al final sino una obligación de
 * CADA voz, y por eso es su propio módulo: si estuviera repartido, la voz
 * dieciséis se olvidaría de aplicarlo y sonaría a juguete al lado de las otras.
 *
 * El azar entra por parámetro. Un test que llame a `Math.random` es un test que
 * puede fallar sin que nada esté roto (regla D1), y esto se comprueba con
 * rangos.
 */

import type { Random } from '@/lib/system/lore';

/** Cuánto se mueve por defecto: ±2%, que es imperceptible de a una. */
export const JITTER = 0.02;

/**
 * Mueve una magnitud un ±`pct` alrededor de su valor.
 *
 * Vale para frecuencias, tiempos y ganancias por igual, porque el desvío es
 * PROPORCIONAL y no absoluto: sumar milisegundos fijos a una envolvente de 3 ms
 * la dejaría en negativo, mientras que un porcentaje la deja siempre positiva.
 */
export function vary(value: number, pct: number = JITTER, random: Random = Math.random): number {
    if (pct === 0) return value;

    // `random()` da [0,1); el ×2−1 lo lleva a [−1,1) y el ×pct lo encoge.
    return value * (1 + (random() * 2 - 1) * pct);
}

/**
 * Lo mismo para lo que se cuenta en unidades enteras.
 *
 * ⚠ NUNCA DEVUELVE CERO. Los escalones del glitch se cuentan con esto, y una
 * ráfaga de cero escalones es silencio: la imagen temblaría y el sonido no
 * llegaría, que es el único fallo que este sistema no se puede permitir.
 */
export function varyInt(value: number, pct: number = JITTER, random: Random = Math.random): number {
    return Math.max(1, Math.round(vary(value, pct, random)));
}
