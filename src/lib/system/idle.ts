// src/lib/system/idle.ts

/**
 * Cuánto hace que no tocás nada.
 *
 * ⚠ ESTO NO EXISTÍA, y por eso `[SEGUÍS AHÍ]` no podía salir NUNCA: los dos
 * sitios que arman el contexto del sistema —`showFragment()` y el marcador de
 * posición del editor— pasaban `idleMs: 0` fijo, así que la única frase que
 * pregunta por la inactividad no llegaba a mirarse jamás. Estaba escrita, con su
 * traducción y su condición, y era código muerto.
 *
 * Vive en un módulo suelto y no en un hook porque lo consultan cosas que no son
 * componentes (`lore.ts` a través del contexto), y porque el reloj de la
 * inactividad es UNO para toda la pestaña: dos contadores distintos darían dos
 * respuestas a la misma pregunta.
 *
 * Se apoya en el reloj del navegador y no en un temporizador propio: un
 * `setInterval` corriendo todo el rato para saber si alguien está quieto es
 * justo lo contrario de lo que hace falta, y además se desajusta cuando el
 * navegador congela la pestaña en segundo plano.
 */

let ultimaActividad = Date.now();

/** Lo llama cualquier señal de que hay alguien delante. */
export function markActivity() {
    ultimaActividad = Date.now();
}

/** Milisegundos desde la última señal de vida. */
export function idleMs(): number {
    return Date.now() - ultimaActividad;
}

/** Sólo para los tests: vuelve a poner el reloj a cero. */
export function resetIdle() {
    ultimaActividad = Date.now();
}

/** Sólo para los tests: finge que hace `ms` que nadie toca nada. */
export function fakeIdle(ms: number) {
    ultimaActividad = Date.now() - ms;
}
