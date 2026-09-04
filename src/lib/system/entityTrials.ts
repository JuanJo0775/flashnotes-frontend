// src/lib/system/entityTrials.ts

/**
 * Las trampas: cuál toca y cómo se verifica.
 *
 * ⚠ NINGUNA INVENTA ALMACENAMIENTO PARA COMPROBARSE. La app ya sabe con qué
 * palabra entraste a la v0.2 y qué procesos hay. Una trampa que necesitara su
 * propio registro sería una trampa que se puede desincronizar, y entonces no
 * mide nada.
 *
 * Módulo puro: sin estado, sin DOM, sin relojes. Recibe dónde está el ente y
 * qué sabe la app, y devuelve qué toca. Se prueba como una tabla.
 */

import type { EntitySnapshot } from '@/lib/system/entity';

export type Trial =
    /** «¿con qué palabra entraste a la 0.2?» — la única que él puede comprobar. */
    | 'word'
    /** Afirma algo falso que un comando desmiente. */
    | 'lie'
    /** «puedo limpiar todo esto» — aceptar cuesta de verdad. */
    | 'offer'
    /** «escribí //reset. vas a descubrir algo.» */
    | 'dare';

/** Lo que la app ya sabe y él consulta. */
export interface TrialWorld {
    /** La palabra con la que se entró a la v0.2, o `null` si nunca se entró. */
    word: string | null;
}

/*
 * A los cuántos intercambios de la fase salta cada cosa.
 *
 * No son cifras de dificultad: son márgenes para que nada suene a formulario.
 * Soltar la pregunta en la primera frase de `burlon` la convertiría en un
 * trámite; dejarla para la décima haría que casi nadie llegara.
 */
const MIDE_A_LOS = 3;
const OFRECE_A_LOS = 2;
const RETA_A_LOS = 5;

/**
 * Cuántos intercambios aguanta la mentira antes de darse por tragada.
 *
 * Se dice a los tres, así que esto son cuatro más hablando con él sin ir a
 * comprobar nada. No es un cronómetro castigándote: es que a la quinta frase
 * después de afirmar algo, si no fuiste a mirar, ya no vas a ir.
 */
const TRAGADA_A_LOS = 7;

/**
 * Qué trampa toca ahora, o `null` si ninguna.
 *
 * ⚠ EN `burlon` SIEMPRE HAY UNA PUERTA ABIERTA. Las dos que llevan a `hablando`
 * son `word` y `lie`, y no pueden cerrarse las dos a la vez: sin palabra
 * guardada cae en `lie`, y sin `lie` disponible vuelve a `word`. Si las dos se
 * cerraran, el juego se quedaría sin final **sin dar ningún error**, que es la
 * peor forma de romperse.
 */
export function trialDue(
    snapshot: EntitySnapshot,
    world: TrialWorld
): Trial | null {
    if (snapshot.phase === 'burlon') {
        if (snapshot.exchanges < MIDE_A_LOS) return null;

        // Con palabra guardada, la puerta limpia es medirte: es la única
        // pregunta del juego cuya respuesta el sistema conoce.
        if (world.word !== null) return 'word';

        // Sin palabra no hay nada que comprobar, y preguntarla sería un farol.
        // Queda la mentira — y si ya la dijo, se calla hasta que la resuelvas.
        if (snapshot.lieStanding) return null;

        /*
         * ⚠ ACÁ SE DESDICE, Y ES A PROPÓSITO.
         *
         * Si ya te la tragaste, esa puerta debería quedar cerrada. Pero sin
         * palabra guardada tampoco puede medirte, y cerrar las dos dejaría a
         * alguien encerrado para siempre. Que repita una mentira que ya colaste
         * es un precio pequeño al lado de eso — y tampoco le queda mal.
         */
        return 'lie';
    }

    if (snapshot.phase === 'hablando') {
        // Retar dos veces convierte el reto en una muletilla.
        if (snapshot.dared) return null;

        if (snapshot.exchanges >= RETA_A_LOS) return 'dare';
        if (snapshot.exchanges >= OFRECE_A_LOS) return 'offer';
    }

    return null;
}

/**
 * ¿Se te pasó la mentira?
 *
 * Se la tragó quien siguió hablando sin ir a comprobar nada. No es que él te
 * castigue: es que dejaste pasar la ocasión de pillarlo, y él se dio cuenta —
 * que es peor.
 *
 * ⚠ SÓLO CADUCA SI QUEDA OTRA PUERTA, o sea si hay palabra que preguntarte.
 *
 * Sin palabra, la mentira es el único camino a `hablando`. Darla por tragada
 * ahí obligaba a volver a decirla para no encerrarte, y repetir una afirmación
 * dos frases después lo delata como un guion en bucle. Dejándola en pie no hay
 * ni repetición ni callejón: sigue esperando a que vayas a mirar, todo el
 * tiempo que haga falta. Que tenga paciencia le queda bien.
 */
export function lieGoneStale(
    snapshot: EntitySnapshot,
    world: TrialWorld
): boolean {
    if (snapshot.lieStanding !== true) return false;
    if (world.word === null) return false;

    return snapshot.exchanges >= TRAGADA_A_LOS;
}

/**
 * Cuántos intercambios le das para escribirlo antes de darlo por esquivado.
 *
 * El reto sale a los cinco, así que son cinco frases más hablando con él sin
 * hacerle caso. Suficiente para que no sea un cronómetro, corto para que el
 * reproche llegue mientras todavía te acordás de qué te pidió.
 */
const ESQUIVA_A_LOS = 10;

/**
 * ¿Se le nota que no vas a escribirlo?
 *
 * Te retó, seguiste hablando y no lo hiciste. Él no te lo impide ni te lo
 * recuerda: espera, y cuando ya está claro te lo dice una vez.
 */
export function dodgedNow(snapshot: EntitySnapshot): boolean {
    return snapshot.dared === true && snapshot.exchanges >= ESQUIVA_A_LOS;
}

/**
 * ¿Acertó la palabra?
 *
 * Se compara sin mayúsculas ni espacios: la palabra se descifra del morse a
 * mano y se teclea como salga. Exigir la forma exacta castigaría el descifrado,
 * que ya costó, en vez de la comprensión, que es lo que se está midiendo.
 */
export function wordIsRight(answer: string, stored: string | null): boolean {
    if (stored === null) return false;

    return answer.trim().toLowerCase() === stored.trim().toLowerCase();
}
