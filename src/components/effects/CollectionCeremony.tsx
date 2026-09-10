// src/components/effects/CollectionCeremony.tsx
'use client';

import { useEffect, useState } from 'react';
import { ART_TOTAL, readFound } from '@/lib/system/asciiArt';
import { subscribeHints } from '@/lib/system/artHints';
import { CEREMONIA_ESPERA_MS, CEREMONIA_MS } from '@/lib/system/ceremonia';
import { useSystemState } from '@/hooks/useSystemState';

/**
 * LA DIECISÉIS.
 *
 * ⚠ QUÉ PROBLEMA RESUELVE. Poner la última pieza no se veía. El contador decía
 * `16/16` y ya: el único logro largo del juego —dieciséis piezas por dieciséis
 * caminos distintos, el pong, el reloj, la v0.2, el ente— terminaba en un número
 * que cambia. Por el lado del sonido ya estaba resuelto: la sala se cae y el
 * acuse queda solo en el silencio. Faltaba lo que se ve.
 *
 * LO QUE PASA: el nivel de la imagen BAJA, y se queda abajo segundo y medio. Sin
 * fotogramas —entra y sale de golpe, como todos los cambios de estado de esta
 * app— y sin nada más. Es la misma técnica de `level-drop`, y es exactamente lo
 * que el sonido hace al callar la sala: la máquina haciendo sitio.
 *
 * ⚠ Y NO HAY UNA LÍNEA DE BARRIDO PROPIA, QUE ERA LA PRIMERA IDEA. Se escribió
 * —una pasada única, más gruesa, más clara y más lenta— y la tumbó un test que
 * lleva ahí desde antes: `scanlineAlways`. Hubo una versión «especial» del
 * barrido para el arranque, el colapso y el borrado, y se quitó por esto:
 *
 *   EL BARRIDO ES EL REFRESCO DEL TUBO, Y UN TUBO NO REFRESCA DISTINTO SEGÚN LO
 *   QUE ESTÉ PINTANDO. Con dos versiones, la línea que se ve en un momento no es
 *   la misma que se ve escribiendo — y eso se nota aunque no se sepa decir por
 *   qué.
 *
 * Así que el barrido de siempre sigue bajando, intacto, mientras todo lo demás
 * se apaga un punto: acaba siendo lo único que se mueve en la pantalla, que era
 * justo lo que la línea nueva quería conseguir. No hacía falta dibujarla.
 *
 * ⚠ CUELGA DEL ALMACÉN, NO DE LOS DIECISÉIS SITIOS QUE REGALAN ARTE. Igual que
 * el sonido: `awardFrom` se llama desde media app, y poner esto en cada sitio
 * era el futuro que se evita. Acá se compara la cuenta.
 *
 * ⚠ NO HACE FALTA MIRAR `prefers-reduced-motion`, y por una vez es cierto: acá
 * no se mueve nada. La regla manda sobre cualquier efecto (REGLAS · A3) y este
 * momento la cumple por construcción, no por una excepción — quien la tiene
 * puesta ve exactamente lo mismo que todo el mundo.
 *
 * Un momento, no un cartel: no hay texto, no hay medalla y no hay nada que
 * cerrar. Se ve una vez en la vida de una partida.
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

export default function CollectionCeremony({ demo = false }: Props) {
    const { effectsEnabled } = useSystemState();

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
                final = setTimeout(
                    () => setActiva(false),
                    CEREMONIA_ESPERA_MS + CEREMONIA_MS
                );
            }

            antes = ahora;
        });

        return () => {
            quitar();
            if (arranque) clearTimeout(arranque);
            if (final) clearTimeout(final);
        };
    }, [demo, effectsEnabled]);

    if (!activa) return null;

    return <div className="ceremonia-nivel" aria-hidden="true" data-testid="ceremonia" />;
}
