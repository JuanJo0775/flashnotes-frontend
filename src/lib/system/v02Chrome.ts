// src/lib/system/v02Chrome.ts

/**
 * El reloj y la fecha de la v0.2.
 *
 * Van al revés los dos, y no es un adorno: son los dos errores más creíbles que
 * se cometen escribiendo esto por primera vez. Restar donde había que sumar, y
 * dar la vuelta a la cadena entera creyendo que eso cambia el formato.
 *
 * Se reconocen al verlos, que es lo que se busca. Un reloj que se para o que
 * enseña un guion es una avería cualquiera; uno que retrocede a la velocidad
 * exacta a la que debería avanzar es un signo mal puesto, y eso tiene autor.
 */

/**
 * La hora, contando hacia atrás desde donde se empezó a mirar.
 *
 * Al mismo ritmo al que avanzaría: un segundo de verdad, un segundo atrás. A
 * otra velocidad se leería como un efecto puesto a propósito; a ésta se lee como
 * un `-` donde iba un `+`.
 */
export function backwardsTime(nowMs: number, startMs: number): number {
    return startMs - (nowMs - startMs);
}

/**
 * La fecha, dada la vuelta entera.
 *
 * `2026.09.02` sale `20.90.6202`. Invertir el ORDEN DE LOS CAMPOS daría
 * `02.09.2026`, que es otro formato correcto — y lo que hace falta acá es uno
 * roto, del que se ve enseguida qué le pasó.
 */
export function reversedDate(texto: string): string {
    return [...texto].reverse().join('');
}
