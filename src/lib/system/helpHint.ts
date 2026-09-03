// src/lib/system/helpHint.ts

/**
 * Si la máquina ya te mandó a `//help` alguna vez.
 *
 * Lo pone el «comando desconocido» —que es donde sale la pista— y lo lee
 * `//help` para dar el faro. Vive en almacenamiento y no en memoria: entre
 * perderse y hacerle caso puede haber una recarga, y perder el hilo ahí dejaría
 * el premio dependiendo de si te distrajiste.
 *
 * ⚠ VIVE EN SU PROPIO MÓDULO Y NO DENTRO DE `commands.ts`, y no es manía de
 * ordenar: `//reset` tiene que poder olvidarlo, y quien lo borra todo es
 * `useSystemState`. Metido en `commands.ts` habría que importar los comandos
 * enteros desde el estado del sistema sólo para llamar a una línea — un import
 * que hoy no existe y que es exactamente como empiezan los ciclos.
 */

const HINT_KEY = 'flashnotes:helpHint';

export function rememberHint() {
    try {
        localStorage.setItem(HINT_KEY, 'on');
    } catch {
        // Sin persistencia dura lo que la pestaña. Aceptable.
    }
}

export function sawHint(): boolean {
    try {
        return localStorage.getItem(HINT_KEY) === 'on';
    } catch {
        return false;
    }
}

/**
 * Lo olvida. Lo llaman `//reset` y los tests.
 *
 * ⚠ ESTO FALTABA, y era la única de las catorce claves que `//reset` no
 * limpiaba: el faro se recuperaba con el primer `//help` de después. Un borrado
 * que deja una pieza puesta no es un borrado.
 */
export function forgetHint() {
    try {
        localStorage.removeItem(HINT_KEY);
    } catch {
        // Nada que hacer.
    }
}
