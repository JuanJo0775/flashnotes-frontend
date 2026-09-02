// src/lib/system/diagnostics.ts

/**
 * La "temperatura del núcleo" que muestra el panel de diagnóstico.
 *
 * Es decoración HONESTA: no mide nada. Se deriva del ritmo de escritura de los
 * últimos minutos, así que sube cuando escribís mucho y baja cuando parás —
 * que es todo lo que se le pide. No pretende representar nada del ordenador de
 * nadie, y por eso vive en su propio módulo en vez de disfrazarse de métrica.
 *
 * Lo único que tiene que cumplir de verdad es no salirse de su escala: el panel
 * dibuja la barra contra estos dos extremos.
 */

/** El núcleo en reposo. Una máquina encendida nunca está a cero. */
export const CORE_MIN_C = 38;

/** El tope. Más allá, la lectura dejaría de ser creíble. */
export const CORE_MAX_C = 71;

/** Cuántos caracteres por minuto suman un grado. */
const CHARS_PER_DEGREE = 12;

/**
 * Traduce un ritmo de escritura (caracteres por minuto) a grados.
 *
 * Un ritmo de mecanografía cómoda —unos 250 cpm— deja el núcleo cerca de los
 * 59°: caliente, visible, todavía lejos del tope. Escribir a mano alzada no
 * debería fundir nunca la lectura.
 */
export function coreTemperature(charsPerMinute: number): number {
    const ritmo = Math.max(0, charsPerMinute);
    const grados = CORE_MIN_C + ritmo / CHARS_PER_DEGREE;

    return Math.min(CORE_MAX_C, Math.round(grados));
}

/** La misma lectura como fracción de 0 a 1, para el medidor ASCII. */
export function coreRatio(charsPerMinute: number): number {
    const grados = coreTemperature(charsPerMinute);
    return (grados - CORE_MIN_C) / (CORE_MAX_C - CORE_MIN_C);
}
