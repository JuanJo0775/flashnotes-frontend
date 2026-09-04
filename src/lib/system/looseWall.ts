// src/lib/system/looseWall.ts

/**
 * Lo que quedó flojo, y lo que pasa si le pegás.
 *
 * ⚠ LA PARTE SUELTA ES UNA VENTANA DE ERROR, y eso no es casualidad: todas las
 * ventanas fantasma llevan `pointer-events: none` desde que existen —son cuadros
 * pintados encima que no pueden atrapar nada— así que UNA QUE RESPONDE es, por
 * sí sola, lo que está mal. Él te dijo que había algo suelto y no dijo qué;
 * esto es lo que hay que notar.
 *
 * ⚠ Y NO SE TOCA HASTA QUE ÉL AFLOJA. Sin `//unbind` las ventanas siguen siendo
 * intocables, que es lo que han sido siempre. La grieta no estaba ahí antes: la
 * abrió él.
 *
 * Módulo puro salvo el almacenamiento. Los golpes viven en memoria a propósito:
 * ver el comentario de `hitWall`.
 */

/**
 * Cuántos golpes aguanta.
 *
 * ⚠ NADIE TE DICE CUÁNTOS FALTAN, y por eso el número importa poco y la
 * PROGRESIÓN importa mucho: cada golpe tiene que verse, o el segundo parece que
 * no hizo nada y se deja de pegar. Siete es bastante para que se note que estás
 * insistiendo, y poco para que nadie se canse antes de llegar.
 */
export const HITS_TO_FALL = 7;

/**
 * Los golpes que lleva.
 *
 * ⚠ EN MEMORIA, NO EN ALMACENAMIENTO, y es deliberado: si sobrevivieran a
 * recargar, alguien podría dejar el cuadro a un golpe de caerse, cerrar, y
 * encontrárselo caído al volver sin haber tocado nada. Lo que se derrumba tiene
 * que derrumbarse mientras mirás.
 */
let golpes = 0;

/** Cuántos lleva encajados. */
export function wallHits(): number {
    return golpes;
}

/** Le pegaste. Devuelve cuántos van, contando éste. */
export function hitWall(): number {
    golpes += 1;
    return golpes;
}

/** ¿Ya se cayó? */
export function wallDown(): boolean {
    return golpes >= HITS_TO_FALL;
}

/** Vuelve a estar entera. Lo llaman el reinicio y los tests. */
export function clearWall() {
    golpes = 0;
}

/**
 * Cuánto se ha ido safando, de 0 a 1.
 *
 * Lo usa quien pinta para inclinarla, descuadrarla y despegarla un poco más con
 * cada golpe. Que sea una proporción y no una lista de estados es lo que deja
 * que el movimiento se vea CONTINUO: con tres estados fijos, los golpes de en
 * medio no harían nada visible y parecería que el cuadro aguanta a ratos.
 */
export function wallLean(hits: number = golpes): number {
    return Math.min(1, Math.max(0, hits / HITS_TO_FALL));
}
