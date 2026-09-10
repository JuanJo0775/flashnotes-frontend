// src/components/effects/CollectionCeremony.tsx
'use client';

import { useEffect, useState } from 'react';
import { ART_TOTAL, readFound } from '@/lib/system/asciiArt';
import { subscribeHints } from '@/lib/system/artHints';
import {
    CEREMONIA_ESPERA_MS,
    CEREMONIA_MS,
} from '@/lib/system/ceremonia';
import { useSystemState } from '@/hooks/useSystemState';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * LA DIECISÉIS.
 *
 * ⚠ QUÉ PROBLEMA RESUELVE. Poner la última pieza no se veía. El contador decía
 * `16/16` y ya: el único logro largo del juego —dieciséis piezas por dieciséis
 * caminos distintos, el pong, el reloj, la v0.2, el ente— terminaba en un
 * número que cambia. Por el lado del sonido ya estaba resuelto: la sala se cae
 * y el acuse queda solo en el silencio. Faltaba lo que se ve.
 *
 * ⚠ Y NO TRAE NI UNA ANIMACIÓN NUEVA. Es lo que pedía la auditoría —«merece lo
 * que ya está construido y no se usa ahí»— y además es lo correcto: el
 * repertorio de esta casa ya tiene las dos cosas que hacen falta.
 *
 *   · EL NIVEL BAJA. Una capa con `backdrop-filter` sobre todo lo pintado, sin
 *     fotogramas: instantánea, como todos los cambios de estado de esta app. Es
 *     la misma técnica de `level-drop`, y es exactamente lo que el sonido hace
 *     al callar la sala — la máquina haciendo sitio.
 *
 *   · Y EL BARRIDO CRUZA UNA VEZ. La misma línea del tubo, los mismos
 *     fotogramas, más lenta, más gruesa y más clara. Mientras dura, la de
 *     siempre se aparta: **lo que destaca es lo ÚNICO que se mueve** — la regla
 *     que ya gobierna la pieza recién sintonizada en la colección.
 *
 * Un momento, no un cartel: no hay texto, no hay medalla y no hay nada que
 * cerrar. Se ve una vez en la vida de una partida y quien lo vio no puede
 * enseñárselo a nadie.
 *
 * ⚠ CUELGA DEL ALMACÉN, NO DE LOS DIECISÉIS SITIOS QUE REGALAN ARTE. Igual que
 * el sonido: `awardFrom` se llama desde media app, y poner esto en cada sitio
 * era el futuro que se evita. Acá se compara la cuenta.
 */

interface Props {
    /**
     * Para el banco: se reproduce sola, sin esperar a que nadie gane nada.
     *
     * ⚠ Y NO TOCA EL ALMACÉN. Un catálogo que te regala las dieciséis piezas al
     * consultarlo deja de ser un catálogo.
     */
    demo?: boolean;
}

/** La clase que el documento lleva mientras dura. Aparta el barrido de siempre. */
const MARCA = 'is-ceremonia';

export default function CollectionCeremony({ demo = false }: Props) {
    const { effectsEnabled } = useSystemState();
    const quieto = usePrefersReducedMotion();
    /*
     * ⚠ EN EL BANCO ARRANCA ENCENDIDA, y se decide acá y no en un efecto: poner
     * el estado desde dentro de un efecto provoca un segundo render encadenado
     * —el linter de React lo prohíbe— y de paso pintaría un cuadro sin nada. La
     * demostración no espera a ningún suceso: ES el suceso.
     */
    const [activa, setActiva] = useState(demo);

    /*
     * ⚠ LA CUENTA ANTERIOR SE LEE EN EL EFECTO Y NO AL PINTAR. `readFound` lee
     * `localStorage`, y leer el almacén durante el render es lo que la casa
     * prohíbe (REGLAS · C1): el servidor pinta una cosa, el navegador otra, y
     * la hidratación se queja.
     */
    useEffect(() => {
        // La demostración ya arrancó encendida: acá no hay nada que esperar.
        if (demo) return;

        // Con los efectos apagados no hay ceremonia. `>chaos off` tiene que
        // poder callar al sistema del todo, y esto es el sistema hablando.
        if (!effectsEnabled) return;

        let antes = readFound().size;
        let arranque: ReturnType<typeof setTimeout> | null = null;
        let final: ReturnType<typeof setTimeout> | null = null;

        const quitar = subscribeHints(() => {
            const ahora = readFound().size;

            /*
             * ⚠ LAS DOS CONDICIONES, Y NO SÓLO LA PRIMERA. `>= ART_TOTAL` a
             * secas dispararía en cada aviso de pistas de una partida ya
             * completa — y hay avisos cada vez que ganás, revelás o abrís algo.
             * Lo que se celebra es el CRUCE, que ocurre una vez.
             */
            if (ahora >= ART_TOTAL && antes < ART_TOTAL) {
                arranque = setTimeout(() => setActiva(true), CEREMONIA_ESPERA_MS);
                final = setTimeout(() => setActiva(false), CEREMONIA_ESPERA_MS + CEREMONIA_MS);
            }

            antes = ahora;
        });

        return () => {
            quitar();
            if (arranque) clearTimeout(arranque);
            if (final) clearTimeout(final);
        };
    }, [demo, effectsEnabled]);

    /*
     * Y la marca en el documento, que es lo que aparta el barrido de siempre.
     * Va acá y no en el efecto de arriba para que se limpie sola si el
     * componente se desmonta a mitad — con la clase colgada, la app se quedaría
     * sin su línea para siempre.
     */
    useEffect(() => {
        if (!activa) return;

        document.body.classList.add(MARCA);
        return () => document.body.classList.remove(MARCA);
    }, [activa]);

    if (!activa) return null;

    return (
        <>
            {/* El nivel bajando. Sin fotogramas: entra y sale de golpe. */}
            <div className="ceremonia-nivel" aria-hidden="true" data-testid="ceremonia" />

            {/*
                Y la línea, que es la única parte que se MUEVE — así que es la
                única que se salta con `prefers-reduced-motion` (REGLAS · A3).
                Quien lo tiene puesto no se queda sin momento: la sala se calla
                igual y el nivel baja igual.
            */}
            {!quieto && (
                <div
                    className="scanline-effect is-ceremonia"
                    aria-hidden="true"
                    data-testid="ceremonia-barrido"
                    /*
                     * ⚠ LA DURACIÓN VIENE DEL MÓDULO, no de la hoja de estilo.
                     * Es el MISMO hueco que el del silencio, y escrita en dos
                     * sitios se separaría el día que alguien ajuste uno: la
                     * línea seguiría bajando con la sala ya encendida.
                     */
                    style={{ animationDuration: `${CEREMONIA_MS}ms` }}
                />
            )}
        </>
    );
}
