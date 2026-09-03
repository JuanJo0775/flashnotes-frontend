// src/hooks/useClock.ts
'use client';

import { useSyncExternalStore } from 'react';
import { formatTime } from '@/lib/utils/formatters';
import { isV02 } from '@/lib/system/v02';
import { backwardsTime } from '@/lib/system/v02Chrome';

/**
 * La hora del equipo, latiendo.
 *
 * El pie de la barra lateral enseñaba `--:--:--` fijo. Ahora enseña la hora de
 * verdad, en formato de 24 horas y con segundos, y gana tres cosas a la vez:
 *
 *  · Una terminal con reloj es una terminal. El hueco ya estaba.
 *  · **Es donde se ve `//date_off`.** El reloj es el sitio donde mirarías la
 *    hora, así que es donde tiene que notarse que el sistema la perdió — pasa
 *    por `formatTime`, que aplica el desvarío.
 *  · El morse de la v0.2 necesita un blanco fijo y siempre presente donde vivir.
 *
 * ALMACÉN DE MÓDULO, no un intervalo por componente: es el patrón de la casa
 * para estado compartido, y además garantiza que la hora sea LA MISMA en todos
 * los sitios donde se pinte. Un intervalo por componente los dejaría desfasados
 * entre sí por unos milisegundos, que en un reloj con segundos se ve.
 *
 * Sólo late mientras alguien mira: el intervalo arranca con el primer suscriptor
 * y se apaga con el último.
 */

/**
 * Lo que se pinta antes de tener hora.
 *
 * El servidor no tiene el reloj del usuario, así que si el primer render del
 * cliente pintara la hora, el servidor y el cliente dirían cosas distintas y
 * React tiraría el árbol entero (ver REGLAS · C1). Mide ocho caracteres, los
 * mismos que `HH:MM:SS`, para que el pie no dé un salto al arrancar.
 */
export const CLOCK_PLACEHOLDER = '--:--:--';

let ahora: string = CLOCK_PLACEHOLDER;
let latido: ReturnType<typeof setInterval> | null = null;
let arranque: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

/**
 * Cuándo se empezó a mirar. La v0.2 cuenta hacia atrás desde acá.
 *
 * Se fija al primer latido y no al cargar el módulo: si se fijara antes, el
 * reloj arrancaría ya retrasado por lo que tardó la página en montar, y lo que
 * tiene que verse es una hora de verdad que se pone a retroceder.
 */
let miradaDesde: number | null = null;

function publicar() {
    const ms = Date.now();
    if (miradaDesde === null) miradaDesde = ms;

    // EN LA v0.2 EL RELOJ VA AL REVÉS. Es el error más creíble que se comete
    // escribiendo esto por primera vez: un `-` donde iba un `+`. Retrocede al
    // mismo ritmo al que avanzaría — a otra velocidad se leería como un efecto
    // puesto aposta, a ésta se lee como un signo mal puesto.
    const instante = isV02() ? new Date(backwardsTime(ms, miradaDesde)) : new Date(ms);

    const siguiente = formatTime(instante);
    if (siguiente === ahora) return;

    ahora = siguiente;
    listeners.forEach((l) => l());
}

export function subscribeToClock(listener: () => void) {
    listeners.add(listener);

    if (latido === null) {
        // La primera hora se publica AGENDADA y no en el acto: hacerlo de forma
        // síncrona durante la suscripción encadena un render en pleno commit.
        // Sin ella, el primer segundo se vería el marcador de posición.
        arranque = setTimeout(publicar, 0);
        latido = setInterval(publicar, 1000);
    }

    return () => {
        listeners.delete(listener);

        // Sin nadie mirando, no hay por qué seguir latiendo.
        if (listeners.size > 0) return;

        if (latido !== null) {
            clearInterval(latido);
            latido = null;
        }
        if (arranque !== null) {
            clearTimeout(arranque);
            arranque = null;
        }
        ahora = CLOCK_PLACEHOLDER;
    };
}

const getSnapshot = () => ahora;
const getServerSnapshot = () => CLOCK_PLACEHOLDER;

export function useClock(): string {
    return useSyncExternalStore(subscribeToClock, getSnapshot, getServerSnapshot);
}
