// src/components/notes/V02Loading.tsx
'use client';

import V02Bar from '@/components/effects/V02Bar';
import { useV02T } from '@/i18n/useV02T';

/**
 * Lo que la v0.2 enseña mientras carga.
 *
 * Ni texto centrado ni puntos suspensivos animados: una barra DIBUJADA con
 * almohadillas y puntos, con su número al lado, y los dos mintiendo. Sube a
 * tirones, a veces retrocede, y pasa del cien sin inmutarse.
 *
 * ⚠ LA BARRA ES `V02Bar` Y NO SE DIBUJA ACÁ. Es LA barra de esta versión, y el
 * arranque de la v0.2 enseña la misma: dibujar una propia para cada sitio daría
 * dos que se separan el día que alguien ajuste una (REGLAS · B5). Lo que pone
 * esta pantalla es lo de alrededor.
 */

export default function V02Loading() {
    const t = useV02T();

    return (
        <div className="v02-loading">
            <pre aria-hidden="true">{t('list.loading')}</pre>
            <V02Bar />

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
