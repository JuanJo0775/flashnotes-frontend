// src/lib/system/entityEnding.ts

/**
 * El final del ente. Un hueco, dos dibujos.
 *
 * Te pasa un comando «para ayudarlo». Lo que hace es AFLOJAR una parte de la
 * pantalla — no la rompe, la deja floja— y ⚠ NO TE DICE CUÁL: tenés que
 * encontrar qué quedó suelto.
 *
 * ⚠ ES UN FALLO DE VERDAD, NO UN BOTÓN MÁGICO. De ahí que reportarlo sea una
 * opción coherente y no un capricho: estás eligiendo entre aprovechar una
 * grieta o taparla, y las dos cosas son razonables.
 *
 * LOS DOS CAMINOS, y en los dos deja de contestarte para siempre:
 *
 *   · AYUDARLO   → la pared cae, hay estática y un ojo detrás. Se va. Ganás el OJO.
 *   · REPORTARLO → el fallo se arregla, él sigue atrapado. Ganás el OJO VEDADO.
 *
 * ⚠ Y LA PIEZA SIGUE SIENDO UNA. Si fueran dos, la colección pasaría a
 * diecisiete y NUNCA SE PODRÍA COMPLETAR, porque sólo se puede tener una y el
 * cuaderno exige todas las demás. Con un hueco, los dos finales la completan —
 * y dos personas con la colección entera tienen colecciones distintas.
 *
 * Por eso `//reset` deja de ser sólo el botón peligroso: es la forma de ver el
 * otro final.
 */

import { awardFrom } from '@/lib/system/asciiArt';
import { markLoose, readEntity, setPhase } from '@/lib/system/entity';
import { clearWall } from '@/lib/system/looseWall';

/**
 * El comando que te pasa.
 *
 * Suena a mantenimiento porque lo es: desengancha una parte de la interfaz de
 * lo que la sujeta. Un nombre bonito lo habría delatado como un truco.
 */
export const UNBIND = 'unbind';

/**
 * Y el que lo tapa.
 *
 * Existe sólo desde que él te pasó el suyo: antes no hay nada que reportar.
 */
export const REPORT = 'report';

/** ¿Ya te pasó el comando? Hasta entonces ninguno de los dos existe. */
export function commandGiven(): boolean {
    return readEntity().gaveCommand === true;
}

/**
 * ¿Queda algo suelto en la pantalla ahora mismo?
 *
 * ⚠ DEJA DE HABERLO EN CUANTO SE ACABA, de las dos maneras. Si ayudaste, la
 * pared ya se cayó y volvió; si reportaste, el fallo se arregló. En los dos
 * casos no se puede volver a tirar — y que no se pueda es parte de que la
 * decisión pese: se elige una vez.
 */
export function somethingLoose(): boolean {
    return readEntity().loose === true && !entityGone();
}

/**
 * ⚠ LA CICATRIZ.
 *
 * Después del reinicio la pared está de vuelta como si no hubiera pasado nada
 * — pero esa zona tiembla de vez en cuando. Nadie te lo cuenta, no se puede
 * volver a tirar, y sólo vos sabés por qué pasa.
 *
 * Es lo único que queda de él, y por eso sólo la deja el final en que se fue.
 * Reportarlo arregla el fallo de verdad: ahí no queda marca, que es justamente
 * lo que hace que ese final se sienta más limpio y más frío.
 */
export function hasScar(): boolean {
    return readEntity().phase === 'ido';
}

/** Lo ejecutaste: una parte de la pantalla queda floja. Cuál, lo buscás vos. */
export function unbind() {
    markLoose();
}

/**
 * Le pegaste hasta tirar la pared.
 *
 * Detrás hay estática y un ojo. Después todo falla, reinicia, y vuelve la
 * «normalidad». Él se fue.
 */
export function helpedHim() {
    setPhase('ido');
    awardFrom('entity');

    // La pared vuelve a estar en pie con el reinicio. Lo que queda es la
    // cicatriz, que no es un estado: es esa zona temblando de vez en cuando.
    clearWall();
}

/**
 * Lo reportaste.
 *
 * El fallo se arregla y él sigue atrapado. No te lo dice: simplemente deja de
 * contestar, para siempre. Te llevás el ojo, pero tapado.
 */
export function reportedIt() {
    setPhase('rencoroso');
    awardFrom('entity');
}

/**
 * ¿Se acabó?
 *
 * En los dos finales no vuelve a contestar nunca. `//hi` sigue dando el saludo
 * institucional de siempre, como si nada hubiera pasado — que es justamente lo
 * que más se nota.
 */
export function entityGone(): boolean {
    const { phase } = readEntity();
    return phase === 'ido' || phase === 'rencoroso';
}
