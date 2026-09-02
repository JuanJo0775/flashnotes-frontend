// src/components/notes/V02Loading.tsx
'use client';

import { useEffect, useState } from 'react';
import { renderLoadingBar, fakeProgress } from '@/lib/system/v02Loading';
import { useV02T } from '@/i18n/useV02T';

/**
 * Lo que la v0.2 enseña mientras carga.
 *
 * Ni texto centrado ni puntos suspensivos animados: una barra DIBUJADA con
 * almohadillas y puntos, con su número al lado, y los dos mintiendo. Sube a
 * tirones, a veces retrocede, y pasa del cien sin inmutarse.
 *
 * El dibujo entero sale de `v02Loading`, que es puro y está probado carácter a
 * carácter. Acá sólo se le da el latido.
 *
 * ⚠ NO BLOQUEA NADA. La barra es cosmética: la lista aparece cuando llegan los
 * datos, diga la barra lo que diga. Si el número mandara, una versión que cuenta
 * mal dejaría al usuario esperando de verdad — y eso ya no sería un efecto de
 * época, sería una app rota (REGLAS · A2).
 */

/** Cada cuánto se recalcula. Lento a propósito: a esta velocidad se lee que va
 *  a tirones; más rápido sería una animación suave, que es lo contrario. */
const LATIDO_MS = 220;

export default function V02Loading() {
    const t = useV02T();
    const [latidos, setLatidos] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setLatidos((n) => n + 1), LATIDO_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="v02-loading">
            <pre aria-hidden="true">{t('list.loading')}</pre>
            <pre aria-hidden="true">{renderLoadingBar(fakeProgress(latidos))}</pre>

            {/* «bloque 3 de ?»: el total no lo sabe nadie, y por eso hay una barra
                que se lo inventa. El signo de interrogación es la explicación de
                todo lo de arriba. */}
            <pre aria-hidden="true">{t('list.v02LoadingDetail')}</pre>

            {/* Quien escucha oye una frase, no una barra repintándose cada
                doscientos milisegundos. */}
            <span className="sr-only">{t('list.loadingDetail')}</span>
        </div>
    );
}
