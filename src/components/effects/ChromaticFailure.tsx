// src/components/effects/ChromaticFailure.tsx
'use client';

import { useEffect } from 'react';
import { useSystemState } from '@/hooks/useSystemState';
import { flipThemeVolatile } from '@/hooks/useTheme';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * La avería de señal: barras de arrastre y el tema sacudiéndose solo.
 *
 * Se dispara al insistir con el interruptor de tema (§14) y NO se arregla sola:
 * dura hasta que recargues. Es el único estado de la app que no se puede
 * deshacer desde la propia app.
 *
 * La aberración cromática la pone el contenedor con una clase; acá viven las
 * dos cosas que necesitan vida propia: las franjas de color y el bucle que
 * invierte el tema cada tantos segundos.
 *
 * EL TEMA SE SACUDE PERO NO SE ROMPE. `flipThemeVolatile` cambia lo que se ve
 * sin tocar `localStorage`, así que recargar —que es lo único que arregla el
 * fallo— te devuelve el tema que vos elegiste. Un chiste que te deja la
 * preferencia cambiada deja de ser un chiste.
 */

/**
 * Cada cuánto se invierte el tema, en milisegundos.
 *
 * Entre 5 y 14 segundos, irregular a propósito: a intervalo fijo se convierte en
 * un latido y el ojo lo empieza a anticipar. Y nunca más rápido que eso — un
 * parpadeo de pantalla completa a más velocidad deja de ser un efecto y pasa a
 * ser un riesgo para quien tiene fotosensibilidad.
 */
const FLIP_MIN_MS = 5000;
const FLIP_MAX_MS = 14_000;

/**
 * Cada cuántas sacudidas cae una ráfaga: la señal invirtiéndose varias veces
 * seguidas en vez de una sola.
 */
const FLICKER_ODDS = 3;

/**
 * Cuántas inversiones tiene la ráfaga.
 *
 * PAR a propósito: impar dejaría el tema cambiado al terminar, y la ráfaga se
 * leería como una sacudida suelta más larga en lugar de como un temblor.
 * Cuatro pasos son claro-oscuro-claro-oscuro-claro.
 */
export const FLICKER_STEPS = 4;

/**
 * Separación entre inversiones de la ráfaga: un saltazo, no un fundido.
 *
 * DECISIÓN TOMADA A CONCIENCIA. A 120 ms la ráfaga supera el umbral de destellos
 * de la WCAG 2.3.1 (no más de tres por segundo). Se acepta porque:
 *
 *  · hay que provocarla a propósito, con diez pulsaciones seguidas de un botón;
 *  · es esporádica —una de cada tres sacudidas, que ya son cada 5–14 s—, no un
 *    parpadeo continuo;
 *  · `prefers-reduced-motion` la desactiva del todo, y ésa es la salida real
 *    para quien la necesita.
 *
 * Si algún día esto se pone delante de un público que no eligió activarlo,
 * vuelve a subir.
 */
export const FLICKER_GAP_MS = 120;

export default function ChromaticFailure() {
    const { chromaticFailure, lockedOut } = useSystemState();
    const reducedMotion = usePrefersReducedMotion();

    // El bloqueo arrastra TODO lo de la avería: las franjas, las sacudidas de
    // tema, las ráfagas. Es el estado más crítico del sistema y tiene que verse
    // peor que el otro, no mejor.
    const fallando = chromaticFailure || lockedOut;

    /**
     * La marca en `<html>`: TODO lo que aparezca queda afectado, sin excepción.
     *
     * Es una decisión de arquitectura, no un parche. El filtro va sobre
     * `.container-terminal`, pero un `<dialog>` abierto con `showModal()` se
     * pinta en la CAPA SUPERIOR del navegador — fuera de ese subárbol — así que
     * el panel de diagnóstico salía limpio en mitad de una pantalla rota.
     *
     * Con la marca en la raíz, el CSS puede alcanzar cualquier cosa que aparezca
     * durante la avería, esté donde esté en el árbol, y la regla vale también
     * para lo que se construya después: si aparece, se ve roto.
     */
    useEffect(() => {
        const raiz = document.documentElement;
        if (fallando) raiz.setAttribute('data-failing', '');
        else raiz.removeAttribute('data-failing');

        return () => raiz.removeAttribute('data-failing');
    }, [fallando]);

    useEffect(() => {
        // Con movimiento reducido la avería SE VE pero no se sacude: un
        // parpadeo de claro a oscuro cada pocos segundos es exactamente lo que
        // quien pide menos movimiento está pidiendo no tener.
        if (!fallando || reducedMotion) return;

        const timers = new Set<ReturnType<typeof setTimeout>>();

        const luegoDe = (ms: number, fn: () => void) => {
            const id = setTimeout(() => {
                timers.delete(id);
                fn();
            }, ms);
            timers.add(id);
        };

        const invertir = () => {
            // Con la pestaña oculta se salta el turno: nadie lo está mirando, y
            // así no se acumulan sacudidas para el regreso.
            if (document.visibilityState === 'visible') flipThemeVolatile();
        };

        const programar = () => {
            const espera = FLIP_MIN_MS + Math.random() * (FLIP_MAX_MS - FLIP_MIN_MS);

            luegoDe(espera, () => {
                if (Math.random() < 1 / FLICKER_ODDS) {
                    // La ráfaga: la señal se cae de golpe y vuelve.
                    for (let i = 0; i < FLICKER_STEPS; i += 1) {
                        luegoDe(i * FLICKER_GAP_MS, invertir);
                    }
                } else {
                    invertir();
                }

                programar();
            });
        };

        programar();

        return () => {
            timers.forEach(clearTimeout);
            timers.clear();
        };
    }, [fallando, reducedMotion]);

    if (!fallando) return null;

    return (
        <>
            <ChromaSplitFilters />
            <div className="chromatic-tear" aria-hidden="true" />
        </>
    );
}

/**
 * Las variantes del filtro que parte los canales de color.
 *
 * POR QUÉ UN FILTRO SVG Y NO `text-shadow`. El text-shadow sólo alcanza al
 * TEXTO: los bordes de los botones, los fondos de las barras, los bloques del
 * medidor ASCII y las guías de puntos se quedaban limpios, y la avería se veía a
 * medias — justo las piezas con más presencia visual eran las que no fallaban.
 *
 * `feColorMatrix` + `feOffset` trabajan sobre lo YA RENDERIZADO, así que separan
 * los canales de TODO lo que hay en pantalla sin importar de qué esté hecho.
 *
 * `color-interpolation-filters="sRGB"` no es opcional: el valor por defecto
 * (`linearRGB`) lava los colores y deja un fantasma gris en vez de rojo y cian.
 *
 * Se publican tres variantes con desplazamientos distintos y la animación las va
 * intercambiando: la aberración se MUEVE en lugar de quedarse clavada, que es lo
 * que separa una señal rota de una foto de una señal rota.
 */
const VARIANTS = [
    { id: 'chroma-split-a', red: [2, 0], rest: [-2, 0] },
    { id: 'chroma-split-b', red: [4, -1], rest: [-1, 1] },
    { id: 'chroma-split-c', red: [-1, 1], rest: [3, -1] },
] as const;

/** Deja pasar sólo el rojo. */
const ONLY_RED = '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0';
/** Deja pasar verde y azul, que juntos dan el cian del otro lado. */
const ONLY_CYAN = '0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0';

export function ChromaSplitFilters() {
    return (
        <svg
            className="chroma-defs"
            width="0"
            height="0"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                {VARIANTS.map(({ id, red, rest }) => (
                    <filter
                        key={id}
                        id={id}
                        // El filtro necesita margen para que lo desplazado no se
                        // recorte contra el borde de la caja.
                        x="-5%"
                        y="-5%"
                        width="110%"
                        height="110%"
                        // En JSX va en camelCase: con el guion, React lo trata
                        // como propiedad desconocida y avisa por consola en cada
                        // render. Sale al DOM igual como
                        // `color-interpolation-filters`.
                        colorInterpolationFilters="sRGB"
                    >
                        {/* `in="SourceGraphic"` es OBLIGATORIO en las dos.
                            Sin él, una primitiva SVG toma por defecto la salida
                            de la anterior: el cian se calculaba sobre la imagen
                            ya reducida a rojo, daba negro, y screen(rojo, negro)
                            dejaba la app entera bañada en rojo en lugar de con
                            franjas de aberración. */}
                        <feColorMatrix
                            in="SourceGraphic"
                            type="matrix"
                            values={ONLY_RED}
                            result="rojo"
                        />
                        <feColorMatrix
                            in="SourceGraphic"
                            type="matrix"
                            values={ONLY_CYAN}
                            result="cian"
                        />
                        <feOffset in="rojo" dx={red[0]} dy={red[1]} result="rojoMovido" />
                        <feOffset in="cian" dx={rest[0]} dy={rest[1]} result="cianMovido" />
                        <feBlend in="rojoMovido" in2="cianMovido" mode="screen" />
                    </filter>
                ))}
            </defs>
        </svg>
    );
}
