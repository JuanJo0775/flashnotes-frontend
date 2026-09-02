// src/lib/system/v02.ts

/**
 * La v0.2 · una versión anterior que nadie borró.
 *
 * No es un modo de juego ni una pantalla nueva: **es la misma app, más vieja**.
 * Y esa frase es toda la arquitectura.
 *
 * POR QUÉ UNA BANDERA Y NO UNA SEGUNDA INTERFAZ. Construir la app otra vez sería
 * enorme y, sobre todo, DIVERGIRÍA: cada arreglo en la de verdad habría que
 * repetirlo o no, y a los tres cambios no serían la misma app con distinta edad,
 * serían dos apps. Con una bandera, los componentes de siempre se comportan peor
 * cuando está puesta — que es exactamente lo que significa «una versión
 * anterior»: el mismo programa, con menos cosas resueltas.
 *
 * SOBREVIVE A RECARGAR, como el bloqueo: una versión que se cae al refrescar no
 * es una versión, es un efecto.
 *
 * Y TIENE SALIDA — la misma palabra que entra, sale, y `//reset` también. Un
 * estado del que no se puede salir sería una app rota, no un secreto.
 *
 * Módulo puro salvo el almacenamiento: el azar llega inyectado para que los
 * tests puedan fijarlo.
 */

const STORAGE_KEY = 'flashnotes:v02';

/** La versión que dice ser cuando está puesta. */
export const V02_LABEL = 'FLASH-NOTES v0.2';

let dentro: boolean | null = null;

export function isV02(): boolean {
    if (dentro !== null) return dentro;

    try {
        return (dentro = localStorage.getItem(STORAGE_KEY) === 'on');
    } catch {
        return (dentro = false);
    }
}

function guardar(valor: boolean) {
    dentro = valor;
    try {
        if (valor) localStorage.setItem(STORAGE_KEY, 'on');
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Sin persistencia dura lo que la pestaña. Aceptable.
    }
}

export function enterV02() {
    guardar(true);
}

export function leaveV02() {
    guardar(false);
}

/** Entra si estabas fuera y sale si estabas dentro. Lo usa la palabra. */
export function toggleV02(): boolean {
    const siguiente = !isV02();
    guardar(siguiente);
    return siguiente;
}

/** Sólo para los tests: tira la caché sin tocar lo guardado. */
export function forgetV02Cache() {
    dentro = null;
}

/* ------------------------------------------------------------------
   Qué falla, y cuánto

   Los números son el corazón de la pieza y salen de usarlo, no de escribirlos.
   Están todos juntos para poder moverlos de una vez.
   ------------------------------------------------------------------ */

/**
 * De cada guardado, cuántas veces MIENTE diciendo que no guardó.
 *
 * Ésta es la pieza central: la v0.2 no es poco fiable con tus datos, es poco
 * fiable HABLANDO DE SÍ MISMA. El susto funciona igual porque no sabés que
 * miente — y cuando vas a mirar, la nota está entera.
 */
export const LIE_ODDS = 0.22;

/**
 * Y cuántas no guarda de verdad.
 *
 * Mucho más raro que la mentira, y con red: lo que no se guardó se puede
 * recuperar mientras la sesión siga abierta. Perder de verdad, sí; perder para
 * siempre y sin aviso, no — eso sigue siendo la primera regla del proyecto.
 */
export const DROP_ODDS = 0.06;

/** De cada intento de tirar una nota, cuántos no hacen nada. */
export const TRASH_FAIL_ODDS = 0.18;

export type SaveOutcome = 'ok' | 'lied' | 'dropped';

/**
 * Qué pasa con este guardado.
 *
 * El orden importa: primero se mira si se pierde —lo más raro y lo más grave— y
 * después si miente. Al revés, una mentira taparía una pérdida y el aviso
 * saldría igual pero por el motivo equivocado.
 */
export function saveOutcome(random: () => number = Math.random): SaveOutcome {
    if (random() < DROP_ODDS) return 'dropped';
    if (random() < LIE_ODDS) return 'lied';
    return 'ok';
}

/** Si este intento de tirar a la papelera se pierde por el camino. */
export function trashFails(random: () => number = Math.random): boolean {
    return random() < TRASH_FAIL_ODDS;
}

/**
 * Una etiqueta a medio hacer.
 *
 * En la v0.2 hay trozos de interfaz que salen con el nombre de la variable o con
 * dígitos sueltos, como lo que se ve cuando algo se dejó a medias. No es ruido
 * al azar: es lo que habría si nadie hubiera escrito todavía el texto.
 */
export function halfBaked(key: string, random: () => number = Math.random): string {
    const n = Math.floor(random() * 900) + 100;
    return `${key.toUpperCase()}_${n}`;
}
