// src/components/effects/PhantomError.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import {
    useSystemState,
    readStoredPhantoms,
    storePhantoms,
} from '@/hooks/useSystemState';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { hiddenCommandNames } from '@/lib/system/commands';

/**
 * Ventanas de error que aparecen y se cierran solas.
 *
 * Con la señal rota (§14), cada tantos segundos se abre en algún sitio de la
 * pantalla un cuadro de error del sistema, se queda un momento y desaparece.
 * Nadie lo abrió y nadie lo cierra.
 *
 * NO ES UN `<dialog>`, y ésa es la decisión importante. Un diálogo de verdad
 * atrapa el foco, se lleva el Escape y bloquea la página: te sacaría del editor
 * en mitad de una frase para enseñarte un chiste. Esto es un cuadro pintado
 * encima, con `pointer-events: none` y `aria-hidden`, que no puede robar nada.
 *
 * Tampoco se anuncia a un lector de pantalla: un error falso leído en voz alta
 * no es una broma, es una mentira.
 */

/** Cada cuánto se abre una, en milisegundos. */
export const PHANTOM_MIN_MS = 7000;
export const PHANTOM_MAX_MS = 19_000;

/**
 * Cuánto se queda en pantalla antes de cerrarse sola.
 *
 * A veces se va enseguida y a veces se queda un buen rato: con una duración fija
 * se convierte en un pulso reconocible y deja de sorprender. Que a veces se
 * quede es lo que hace que la próxima vez no sepas si va a irse.
 */
export const PHANTOM_VISIBLE_MS = 2200;
export const PHANTOM_MIN_VISIBLE_MS = 1400;
export const PHANTOM_MAX_VISIBLE_MS = 14_000;

function visibleMs(): number {
    return (
        PHANTOM_MIN_VISIBLE_MS +
        Math.random() * (PHANTOM_MAX_VISIBLE_MS - PHANTOM_MIN_VISIBLE_MS)
    );
}

/**
 * Lo que dicen.
 *
 * Todas hablan de la SEÑAL y del subsistema de vídeo, nunca de tus notas ni de
 * guardar: un error falso que mencione tus datos daría un susto de verdad, y la
 * regla es que nada aparente pérdida de trabajo. Estas son averías de pantalla,
 * que es exactamente lo que está pasando.
 */
export const PHANTOM_MESSAGES: readonly { code: string; text: string }[] = [
    { code: '0x1F3A', text: 'SEÑAL DE VÍDEO FUERA DE RANGO' },
    { code: '0x00C4', text: 'SINCRONISMO VERTICAL PERDIDO' },
    { code: '0x7E01', text: 'CANAL CROMÁTICO SIN CALIBRAR' },
    { code: '0x2B08', text: 'BÚFER DE PANTALLA DESALINEADO' },
    { code: '0x5D12', text: 'NO HAY TÉCNICO EN ESTE TURNO' },
    { code: '0x0A99', text: 'REINTENTANDO… REINTENTANDO… REINTENTANDO…' },
];

/** Cuántas pueden estar abiertas a la vez con la señal rota. */
export const PHANTOM_MAX_OPEN = 3;

/**
 * Cada cuántas ventanas, en vez de quejarse del vídeo, se le escapa un comando.
 *
 * Es la tercera fuga de los comandos escondidos, y la mejor: `//help` te dice
 * cuántos faltan y a veces suelta uno —eso se lee como ayuda— pero una ventana
 * de error que muestra `//panic` en un volcado se lee como un descuido. Enterarte
 * de algo que el sistema no quería contarte vale más que enterarte porque te lo
 * contó.
 *
 * Una de cada tres: menos, y podrías no ver ninguna en toda una avería; más, y
 * las ventanas dejarían de hablar de la señal, que es de lo que van.
 */
const LEAK_ODDS = 1 / 3;

/**
 * Y cuántas durante el bloqueo.
 *
 * Cinco, y **no se cierran solas**: la pantalla se va llenando. Es la diferencia
 * entre los dos estados — con la señal rota el sistema todavía se recompone
 * solo; con la memoria corrupta ya no limpia nada.
 *
 * No pueden cerrarse de ninguna forma, y no porque se lo impidamos: llevan
 * `pointer-events: none`, así que ni siquiera reciben el clic — y encima huyen
 * cuando les acercás el cursor. Se acumulan y ya está.
 */
export const PHANTOM_MAX_LOCKED = 5;

interface Phantom {
    /** Identifica a ESTA ventana, para poder cerrarla sin tocar a las otras. */
    id: number;
    code: string;
    text: string;
    /** Dónde se abre, en porcentaje de la pantalla. */
    topPct: number;
    leftPct: number;
}

let nextId = Date.now() % 100_000;

/** Cuánto tiene que acercarse el cursor para espantarla, en píxeles. */
const FLEE_MARGIN_PX = 40;

export default function PhantomError() {
    const { chromaticFailure, lockedOut } = useSystemState();
    const reducedMotion = usePrefersReducedMotion();
    const fallando = chromaticFailure || lockedOut;
    const tope = lockedOut ? PHANTOM_MAX_LOCKED : PHANTOM_MAX_OPEN;
    /**
     * Las ventanas abiertas.
     *
     * Arranca VACÍO aunque haya guardadas, y se rellena en un efecto. No es un
     * rodeo: en el primer render, `useSyncExternalStore` todavía devuelve el
     * estado del SERVIDOR —donde `lockedOut` es false y no hay almacenamiento—,
     * así que un inicializador perezoso leía siempre cero ventanas y la
     * recuperación no ocurría nunca. Además, sembrarlas en el primer render
     * daría un desajuste de hidratación: el servidor pinta cero y el cliente
     * cinco.
     */
    const [phantoms, setPhantoms] = useState<Phantom[]>([]);
    const [restored, setRestored] = useState(false);
    const boxesRef = useRef(new Map<number, HTMLDivElement>());

    /**
     * Se aparta si le acercás el cursor.
     *
     * Es lo que la convierte de adorno en presencia: una ventana que te esquiva
     * está claramente ahí y claramente no es tuya.
     *
     * El listener va en `window` y NO en la propia ventana: con
     * `pointer-events: none` —que es lo que impide que te coma un clic— los
     * eventos de ratón nunca llegan al elemento, así que un `onMouseMove` suyo
     * no se dispararía jamás. Se mira la distancia contra su caja real.
     */
    /**
     * Recupera las que quedaron abiertas la última vez.
     *
     * El bloqueo sobrevive a la recarga y ellas son parte de él: volver y
     * encontrarse la pantalla de error LIMPIA daría a entender que recargar
     * sirve de algo, que es justo lo que este estado niega.
     *
     * Va agendado y no llamado en el acto porque un `setState` síncrono dentro
     * de un efecto encadena un render durante el commit.
     */
    useEffect(() => {
        if (!lockedOut || restored) return;

        const id = setTimeout(() => {
            const guardadas = readStoredPhantoms();
            setRestored(true);
            if (guardadas.length > 0) setPhantoms(guardadas);
        }, 0);

        return () => clearTimeout(id);
    }, [lockedOut, restored]);

    // Se recuerdan mientras dure el bloqueo. `clearLockout` las borra junto con
    // él: son parte del mismo estado.
    useEffect(() => {
        if (!lockedOut || !restored) return;
        storePhantoms(phantoms);
    }, [lockedOut, restored, phantoms]);

    useEffect(() => {
        if (phantoms.length === 0) return;

        const alAcercarse = (e: MouseEvent) => {
            const huyen = new Set<number>();

            for (const [id, nodo] of boxesRef.current) {
                const caja = nodo.getBoundingClientRect();
                const cerca =
                    e.clientX > caja.left - FLEE_MARGIN_PX &&
                    e.clientX < caja.right + FLEE_MARGIN_PX &&
                    e.clientY > caja.top - FLEE_MARGIN_PX &&
                    e.clientY < caja.bottom + FLEE_MARGIN_PX;

                if (cerca) huyen.add(id);
            }

            if (huyen.size === 0) return;

            // Sólo se mueve la que tenés encima: si huyeran todas a la vez, se
            // leería como que la pantalla entera se sacude en vez de como que
            // esa ventana te esquiva.
            setPhantoms((abiertas) =>
                abiertas.map((p) =>
                    huyen.has(p.id)
                        ? {
                              ...p,
                              topPct: 10 + Math.random() * 60,
                              leftPct: 10 + Math.random() * 60,
                          }
                        : p
                )
            );
        };

        window.addEventListener('mousemove', alAcercarse, { passive: true });
        return () => window.removeEventListener('mousemove', alAcercarse);
        // Sólo hace falta re-atar cuando cambia si hay ventanas o no; sus
        // posiciones se leen del DOM en cada movimiento.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phantoms.length === 0]);

    useEffect(() => {
        if (!fallando || reducedMotion) return;

        const timers = new Set<ReturnType<typeof setTimeout>>();

        const luegoDe = (ms: number, fn: () => void) => {
            const id = setTimeout(() => {
                timers.delete(id);
                fn();
            }, ms);
            timers.add(id);
        };

        const programar = () => {
            const espera =
                PHANTOM_MIN_MS + Math.random() * (PHANTOM_MAX_MS - PHANTOM_MIN_MS);

            luegoDe(espera, () => {
                if (document.visibilityState === 'visible') {
                    // Casi siempre una. De vez en cuando dos o tres de golpe:
                    // una cascada de errores se lee como que el sistema se está
                    // cayendo, y una sola como que hipó.
                    // Durante el bloqueo salen DE A UNA: la pantalla se llena
                    // poco a poco, que es lo que hace que se sienta como algo
                    // que va empeorando. Cinco de golpe sería un susto, no una
                    // degradación.
                    const cuantas =
                        !lockedOut && Math.random() < 0.25
                            ? 1 + Math.floor(Math.random() * tope)
                            : 1;

                    for (let i = 0; i < cuantas; i += 1) {
                        // Escalonadas: abrirlas en el mismo fotograma se lee
                        // como un diálogo de varias partes, no como tres fallos.
                        luegoDe(i * 140, () => abrirUna(luegoDe));
                    }
                }

                programar();
            });
        };

        /** Abre una ventana y programa su cierre. */
        function abrirUna(despues: (ms: number, fn: () => void) => void) {
            const mensaje =
                Math.random() < LEAK_ODDS && hiddenCommandNames().length > 0
                    ? {
                          code: '0x' + Math.floor(Math.random() * 65536)
                              .toString(16)
                              .toUpperCase()
                              .padStart(4, '0'),
                          text: `SÍMBOLO SIN RESOLVER: ${
                              hiddenCommandNames()[
                                  Math.floor(
                                      Math.random() * hiddenCommandNames().length
                                  )
                              ]
                          }`,
                      }
                    : PHANTOM_MESSAGES[
                          Math.floor(Math.random() * PHANTOM_MESSAGES.length)
                      ];
            const id = (nextId += 1);

            setPhantoms((abiertas) =>
                // Nunca más de tres: por encima de eso deja de leerse como una
                // avería y empieza a leerse como que la app está rota de verdad.
                abiertas.length >= tope
                    ? abiertas
                    : [
                          ...abiertas,
                          {
                              ...mensaje,
                              id,
                              // Dentro del 15–65 %: en las esquinas se leería
                              // como un aviso de la interfaz en vez de como una
                              // ventana perdida.
                              topPct: 12 + Math.random() * 55,
                              leftPct: 10 + Math.random() * 55,
                          },
                      ]
            );

            // Durante el bloqueo NO se cierran: la pantalla se va llenando
            // hasta el tope. Con la señal rota el sistema todavía se recompone
            // solo; con la memoria corrupta ya no limpia nada.
            if (lockedOut) return;

            despues(visibleMs(), () =>
                setPhantoms((abiertas) => abiertas.filter((p) => p.id !== id))
            );
        }

        programar();

        return () => {
            timers.forEach(clearTimeout);
            timers.clear();
            setPhantoms([]);
        };
    }, [fallando, reducedMotion, lockedOut, tope]);

    if (phantoms.length === 0) return null;

    return (
        <>
            {phantoms.map((phantom) => (
                <div
                    key={phantom.id}
                    ref={(nodo) => {
                        if (nodo) boxesRef.current.set(phantom.id, nodo);
                        else boxesRef.current.delete(phantom.id);
                    }}
                    className="phantom-error"
                    aria-hidden="true"
                    style={{
                        top: `${phantom.topPct}%`,
                        left: `${phantom.leftPct}%`,
                        pointerEvents: 'none',
                        // Durante el bloqueo suben POR ENCIMA de la pantalla de
                        // error: si quedaran debajo no se verían, y la gracia es
                        // justamente que te tapen el puzzle. Como no reciben
                        // eventos, taparlo no impide resolverlo.
                        ...(lockedOut ? { zIndex: 10002 } : null),
                    }}
                >
                    <div className="phantom-error-title">
                        <span>⚠ ERROR DEL SISTEMA</span>
                        <span className="phantom-error-close">[X]</span>
                    </div>
                    <div className="phantom-error-body">
                        <p>{phantom.text}</p>
                        <p className="phantom-error-code">CÓDIGO {phantom.code}</p>
                    </div>
                </div>
            ))}
        </>
    );
}
