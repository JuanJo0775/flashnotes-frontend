// src/lib/system/entityFavors.ts

/**
 * Los favores que te pide el ente.
 *
 * ⚠ NO SON TAREAS Y NO HAY CONTADOR. Sólo te pide algo cuando notó que sabés lo
 * que no deberías, y lo que cambia al cumplirlo no es un número: es lo que él
 * sabe de vos. Ver `willingNow()` en este mismo módulo.
 *
 * ⚠ Y NO CONDUCEN A SECRETOS: ACERCAN. Uno que desbloquea algo es una misión, y
 * entonces él pasa a ser un dispensador de contenido. Uno que te deja mirando en
 * la dirección correcta sigue siendo un favor.
 *
 * Los tres se comprueban contra estado QUE YA EXISTE —la papelera de la v0.2, el
 * reloj de inactividad, la pieza que se gana llenando una nota— y los tres
 * suenan a que le sirven a él. Eso último es lo que hace que ayudarlo se sienta
 * como ayudarlo, y no como completar una lista.
 *
 * Módulo puro: sin estado, sin DOM, sin relojes.
 */

import type { Lang } from '@/config/lang';
import type { EntitySnapshot } from '@/lib/system/entity';

type Localized = Readonly<Record<Lang, string>>;

export type Favor =
    /** Ir a la v0.2 y mirar su papelera. Él no puede. */
    | 'v02trash'
    /** Dejarlo en paz diez minutos. */
    | 'quiet'
    /** Llenar una nota hasta el tope. */
    | 'fullnote';

/** Lo que la app ya sabe, traído por quien llama. */
export interface FavorWorld {
    /** ¿Abriste la papelera de la v0.2? */
    sawV02Trash: boolean;
    /** Cuánto llevás sin tocar nada. Ver `idle.ts`. */
    idleMs: number;
    /** ¿Llenaste una nota hasta el tope? Lo dice su pieza. */
    filledNote: boolean;
}

/**
 * Cuántos secretos hacen falta para que empiece a pedirte cosas.
 *
 * ⚠ SE ABRE POR LO QUE SABÉS, NO POR LO QUE HABLASTE. Un contador de
 * intercambios diría «insististe», que ya es lo que abre `burlon`, y repetir la
 * misma puerta dos veces la vacía de significado. Acá lo que le llama la
 * atención es otra cosa: que llegaste a sitios donde no se llega solo.
 */
export const PIDE_CON = 12;

/**
 * Los diez minutos de silencio.
 *
 * Corto sería un trámite; largo de más, un castigo. Diez minutos es lo que
 * tarda alguien en irse a hacer otra cosa y volver — y que te pida justo eso,
 * en una app que no te pide nada nunca, es lo raro del asunto.
 */
export const QUIET_MS = 10 * 60 * 1000;

/**
 * Qué favor te toca, o `null` si ninguno.
 *
 * Van en orden y de uno en uno: pedir tres cosas a la vez es una lista de
 * tareas, y él no reparte tareas.
 */
export function favorDue(
    snapshot: EntitySnapshot,
    secretsFound: number
): Favor | null {
    // No le pide favores a alguien con quien todavía no habla.
    if (snapshot.phase !== 'hablando' && snapshot.phase !== 'pidiendo') {
        return null;
    }

    if (secretsFound < PIDE_CON) return null;

    if (snapshot.didV02Trash !== true) return 'v02trash';
    if (snapshot.didQuiet !== true) return 'quiet';
    if (snapshot.didFullNote !== true) return 'fullnote';

    // Ya te pidió los tres. Lo que quería saber de vos ya lo sabe.
    return null;
}

/** ¿Está hecho? Cada uno contra lo que la app ya registra. */
export function favorDone(favor: Favor, world: FavorWorld): boolean {
    if (favor === 'v02trash') return world.sawV02Trash;
    if (favor === 'quiet') return world.idleMs >= QUIET_MS;

    return world.filledNote;
}

/*
 * ⚠ CADA UNO SUENA A QUE LE SIRVE A ÉL.
 *
 * «Yo no puedo» no es una excusa de diseño: es cierto, está encerrado. Un favor
 * que suena a tarea asignada convierte al ente en un tablero de misiones, y ahí
 * se acaba el personaje — deja de pedirte algo y pasa a darte trabajo.
 */
const LINEAS: Readonly<Record<Favor, Localized>> = {
    v02trash: {
        es: 'andá a la 0.2 y mirá qué hay en la papelera. yo no puedo.',
        en: 'go into 0.2 and look at what is in the trash. i cannot.',
    },
    quiet: {
        es: 'dejame en paz diez minutos. después seguimos.',
        en: 'leave me alone for ten minutes. we continue after.',
    },
    fullnote: {
        es: 'llená una nota entera. quiero ver si podés.',
        en: 'fill a whole note. i want to see if you can.',
    },
};

/**
 * ¿Se decide a pasarte el comando?
 *
 * ⚠ NO ES «CONFIADO». No es que él confíe en general: es que VOS le inspirás
 * confianza a ÉL para pedirte esto. De esa diferencia depende que la escena no
 * suene a que te ganaste una medalla.
 *
 * ⚠ Y NO ES UNA SUMA. No es «tres de cinco»: son TRES COSAS A LA VEZ, y cada
 * una le dice algo distinto que ninguna otra puede decirle.
 *
 *   · le pasaste alguna prueba → NO SOS TONTO
 *   · le hiciste algún favor   → HARÍAS COSAS POR ÉL
 *   · sabés lo que no deberías → NO TE VAS A ASUSTAR
 *
 * Un `&&` y no una cuenta. Con un contador vuelve a ser una barra de progreso,
 * y con ella se pierde lo único que hace especial esta fase: que ÉL decide, y
 * lo decide por lo que sabe de vos. Hay un test que intenta compensar una cosa
 * con muchísimo de otra, y tiene que seguir dando que no.
 */
export function willingNow(
    snapshot: EntitySnapshot,
    secretsFound: number
): boolean {
    // De `ido` y `rencoroso` no se vuelve, y en `dispuesto` ya está decidido.
    if (snapshot.phase !== 'hablando' && snapshot.phase !== 'pidiendo') {
        return false;
    }

    const noSosTonto = snapshot.provedIt === true;
    const hariasAlgoPorEl =
        snapshot.didV02Trash === true ||
        snapshot.didQuiet === true ||
        snapshot.didFullNote === true;
    const noTeVasAAsustar = secretsFound >= PIDE_CON;

    return noSosTonto && hariasAlgoPorEl && noTeVasAAsustar;
}

/** Cómo lo pide. */
export function favorLine(favor: Favor, lang: Lang): string {
    return LINEAS[favor][lang];
}
