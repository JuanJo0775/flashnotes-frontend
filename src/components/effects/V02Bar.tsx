// src/components/effects/V02Bar.tsx
'use client';

import { useEffect, useState } from 'react';
import { renderLoadingBar, fakeProgress } from '@/lib/system/v02Loading';

/**
 * La barra de 40 columnas de la v0.2, con su latido.
 *
 * ⚠ HAY UNA SOLA Y LA USAN DOS SITIOS: la lista cargando y el arranque de esa
 * misma versión. Es LA barra de esa máquina — la que escribe quien no tiene
 * forma de saber cuánto queda y la pone igual, porque una pantalla de carga sin
 * barra parecía peor que una que miente. Dibujar otra para el arranque habría
 * dado dos barras que se separan el día que alguien ajuste una (REGLAS · B5).
 *
 * El dibujo entero sale de `v02Loading`, que es puro y está probado carácter a
 * carácter. Acá sólo se le da el latido.
 *
 * ⚠ NO BLOQUEA NADA, ni acá ni allá. La barra es cosmética: la lista aparece
 * cuando llegan los datos y el arranque termina cuando termina su tramo, diga la
 * barra lo que diga. Si el número mandara, una versión que cuenta mal dejaría al
 * usuario esperando de verdad — y eso ya no sería un efecto de época, sería una
 * app rota (REGLAS · A2).
 */

/**
 * Cada cuánto se recalcula.
 *
 * Lento a propósito: a esta velocidad se lee que va a tirones; más rápido sería
 * una animación suave, que es exactamente lo contrario de lo que cuenta.
 */
const LATIDO_MS = 220;

interface Props {
    /** Con qué clase se pinta. El arranque la usa además como marca de sonido. */
    className?: string;
}

export default function V02Bar({ className }: Props) {
    const [latidos, setLatidos] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setLatidos((n) => n + 1), LATIDO_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <pre className={className} aria-hidden="true">
            {renderLoadingBar(fakeProgress(latidos))}
        </pre>
    );
}
