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

/**
 * La palabra con la que entraste.
 *
 * ⚠ SE GUARDA, Y ES LO QUE IMPIDE QUE TE QUEDES ENCERRADO.
 *
 * El morse cambia por sesión, y dentro de la v0.2 el reloj ya no lo enseña —
 * es la puerta de entrada, no algo de esa versión. Sin guardar la palabra,
 * bastaba recargar para que la de la sesión fuera otra: la que sabías ya no
 * servía, el reloj no daba la nueva, y la salida desaparecía.
 *
 * Guardándola, la puerta por la que entraste sigue siendo la puerta por la que
 * salís, mañana también. Un estado del que no se puede salir sería una app
 * rota, no un secreto.
 */
const WORD_KEY = 'flashnotes:v02word';

/**
 * Que ya usaste el código para las DOS cosas: entrar y salir.
 *
 * ⚠ NO ES LO MISMO QUE HABER ENTRADO. Entrar se hace por accidente: se descifra
 * el morse, se teclea la palabra y pasa algo. Salir con la misma palabra exige
 * haber entendido QUÉ es esa palabra — que no es un comando más, sino una llave
 * que gira en los dos sentidos. Ésa es la comprensión que se premia.
 *
 * ⚠ Y NO SE BORRA AL SALIR. `leaveV02` se lleva la palabra —para que la próxima
 * puerta sea otra— pero no esto: el viaje ya lo hiciste. Sólo `//reset` lo
 * olvida, con todo lo demás.
 */
const TRIP_KEY = 'flashnotes:v02trip';

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

export function enterV02(word?: string) {
    guardar(true);
    if (!word) return;

    try {
        localStorage.setItem(WORD_KEY, word.toUpperCase());
    } catch {
        // Sin persistencia queda la de la sesión, que es la misma mientras no
        // recargues.
    }
}

/** La palabra que abre y cierra ESTA v0.2, o `null` si no se guardó. */
export function v02Word(): string | null {
    try {
        return localStorage.getItem(WORD_KEY);
    } catch {
        return null;
    }
}

export function leaveV02() {
    guardar(false);
    try {
        localStorage.removeItem(WORD_KEY);
    } catch {
        // Nada que hacer.
    }
}

/** Entra si estabas fuera y sale si estabas dentro. Lo usa la palabra. */
export function toggleV02(word?: string): boolean {
    if (isV02()) {
        leaveV02();
        return false;
    }

    enterV02(word);
    return true;
}

/** Sólo para los tests: tira la caché sin tocar lo guardado. */
export function forgetV02Cache() {
    dentro = null;
}

/** El código te sacó de la v0.2: ida y vuelta completas. */
export function markV02RoundTrip() {
    try {
        localStorage.setItem(TRIP_KEY, 'on');
    } catch {
        // Sin persistencia dura lo que la pestaña. Aceptable.
    }
}

export function didV02RoundTrip(): boolean {
    try {
        return localStorage.getItem(TRIP_KEY) === 'on';
    } catch {
        return false;
    }
}

/** Lo olvida. Lo usan `//reset` y los tests. */
export function forgetV02Trip() {
    try {
        localStorage.removeItem(TRIP_KEY);
    } catch {
        // Nada que hacer.
    }
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

/* ------------------------------------------------------------------
   El texto de una versión sin terminar

   Tres cosas distintas, y ninguna es «poner texto raro»:

     · SIN TRADUCIR — quedó la cadena en inglés porque nadie la tradujo. Es el
       fallo más común de una versión temprana y el que más se reconoce.
     · A MEDIO HACER — sale el nombre de la variable con su número, que es lo
       que se ve cuando el texto todavía no se escribió.
     · MAL TRADUCIDO — alguien la tradujo palabra por palabra sin mirar qué era.
       Es peor que no traducirla, y por eso es más gracioso.

   Es DETERMINISTA por clave: la misma etiqueta se rompe siempre igual. Si
   cambiara en cada repintado, la interfaz sería un cartel de neón parpadeando y
   dejaría de leerse como una versión vieja para leerse como una avería.
   ------------------------------------------------------------------ */

/** De cada etiqueta, cuántas salen mal. Una de cada cuatro: se nota sin cansar. */
const BROKEN_LABEL_ODDS = 0.26;

/**
 * Un número reproducible a partir de una clave, entre 0 y 1.
 *
 * ⚠ LLEVA MEZCLA FINAL, y hace falta. Con el FNV a secas, claves parecidas
 * —`clave1`, `clave2`, `clave3`…— caían en el mismo tramo: la mitad de las
 * etiquetas salían rotas en vez de una de cada cuatro, porque los bits altos
 * apenas cambiaban y son los que mandan al pasar a decimal. Con la avalancha,
 * un carácter distinto cambia el número entero.
 *
 * Lo cazó un test que exige que la MAYORÍA de las etiquetas salgan bien: si
 * fallaran todas sería ilegible, no vieja.
 */
function ruido(clave: string): number {
    let h = 2166136261;
    for (let i = 0; i < clave.length; i += 1) {
        h ^= clave.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }

    h ^= h >>> 16;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909);
    h ^= h >>> 16;

    return (h >>> 0) / 4294967296;
}

export interface LabelSources {
    /** El texto bien, en el idioma que toca. */
    ok: string;
    /** El mismo texto en inglés, para dejarlo sin traducir. */
    raw?: string;
}

/**
 * Cómo sale esta etiqueta en la v0.2.
 *
 * `key` identifica la etiqueta y decide su suerte, siempre la misma.
 */
export function v02Label(key: string, sources: LabelSources): string {
    const dado = ruido(key);
    if (dado >= BROKEN_LABEL_ODDS) return sources.ok;

    // Se reparte el tramo roto en tres, con el mismo dado: así una etiqueta
    // concreta tiene una avería concreta y no tres posibles.
    const cual = (dado / BROKEN_LABEL_ODDS) * 3;

    if (cual < 1 && sources.raw) return sources.raw;
    if (cual < 2) return halfBaked(key, () => ruido(key + 'n'));

    // Mal traducida: se le pega el sufijo de una traducción hecha a máquina.
    return `${sources.ok.toUpperCase()} (SIC)`;
}
