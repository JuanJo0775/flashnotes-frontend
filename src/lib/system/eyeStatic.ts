// src/lib/system/eyeStatic.ts

/**
 * El ojo detrás de la pared, moviéndose.
 *
 * ⚠ EL DIBUJO DE LA COLECCIÓN ESTÁ QUIETO A PROPÓSITO: una pieza que cambiara
 * cada vez no se podría coleccionar. Pero lo que se ve DETRÁS DE LA PARED no es
 * la pieza en una vitrina — es la cosa, mirándote— y ahí quieto no sirve: un
 * dibujo fijo se lee como una ilustración, y lo que tiene que leerse es que hay
 * algo vivo del otro lado.
 *
 * Se mueve de dos maneras, y las dos salen del mismo dibujo:
 *
 *   · LA LLUVIA SE AGITA. Cada dígito se vuelve a tirar en cada fotograma, pero
 *     LOS HUECOS NO SE TOCAN. Todo el campo hierve y la forma del ojo se queda
 *     exactamente donde está — que es lo que la hace mirar. Si se movieran
 *     también los huecos sería ruido; lo que inquieta es que el ruido cambie y
 *     el ojo no.
 *
 *   · PARPADEA. De tanto en tanto los huecos se llenan por un instante y el ojo
 *     desaparece dentro del campo. Un parpadeo es la señal más barata y más
 *     antigua de que algo está vivo, y acá además es literal: se cierra.
 *
 * Módulo puro: recibe el dibujo y un dado, y devuelve un fotograma.
 */

/**
 * Un fotograma del ojo.
 *
 * `art` es el dibujo tal cual está en la colección. Los dígitos se vuelven a
 * tirar; los espacios se respetan, salvo en el parpadeo, que los rellena.
 *
 * ⚠ NO TOCA NINGÚN OTRO CARÁCTER. El ojo tapado —el del final en que lo
 * reportás— lleva `#` en la banda de censura, y esos tienen que quedarse: si la
 * lluvia se los comiera, la censura se disolvería sola en dos fotogramas.
 */
export function staticFrame(
    art: string,
    blink: boolean,
    random: () => number = Math.random
): string {
    let salida = '';

    for (const c of art) {
        if (c === '\n') {
            salida += c;
            continue;
        }

        // El hueco: se queda hueco, salvo cuando cierra el ojo.
        if (c === ' ') {
            salida += blink ? digito(random) : ' ';
            continue;
        }

        // La lluvia se vuelve a tirar. Lo demás —la banda de censura— no.
        salida += c === '0' || c === '1' ? digito(random) : c;
    }

    return salida;
}

function digito(random: () => number): string {
    return random() < 0.5 ? '0' : '1';
}

/**
 * Cada cuánto se vuelve a tirar la lluvia, en milisegundos.
 *
 * Rápido, pero no tanto como para que sea una mancha: a este ritmo se ve que
 * los dígitos cambian de uno en uno, que es lo que hace que el campo parezca
 * lleno de cosas y no una textura.
 */
export const FRAME_MS = 110;

/**
 * Y cada cuántos fotogramas parpadea.
 *
 * ⚠ POCO. Un parpadeo cada dos segundos es un tic nervioso; uno cada tanto es
 * algo que está ahí quieto, mirando, y que de vez en cuando cierra los ojos.
 * Lo segundo da mucho más miedo.
 */
export const BLINK_EVERY = 26;

/** ¿Le toca parpadear a este fotograma? Dos seguidos: abrir y cerrar. */
export function isBlink(frame: number): boolean {
    const dentro = frame % BLINK_EVERY;
    return dentro === 0 || dentro === 1;
}
