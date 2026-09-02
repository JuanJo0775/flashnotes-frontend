// src/components/layout/SystemClock.tsx
'use client';

import { useSystemState } from '@/hooks/useSystemState';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useClock } from '@/hooks/useClock';
import { sessionMorse } from '@/lib/system/morse';
import { markSecretFound } from '@/hooks/useSystemState';
import { useT } from '@/i18n';

/**
 * La hora del equipo, y lo que esconde.
 *
 * Enseña la hora real en 24 h con segundos. **Tres clics seguidos** la cambian
 * por una palabra en morse durante unos segundos: es la puerta de la v0.2.
 *
 * DE DÓNDE SALIÓ. Este hueco enseñaba `--:--:--` cuando no había nota abierta, y
 * eso ya parecía morse. La pieza no se inventó: se leyó de algo que llevaba ahí
 * desde el principio.
 *
 * POR QUÉ TRES CLICS Y NO OTRA COSA. Sobre un reloj, un clic no significa nada y
 * nadie lo hace sin querer tres veces seguidas. Es el mismo gesto que ya abre el
 * rótulo de la cabecera, así que quien encontró aquél sabe que acá se prueba —
 * y quien no, no pierde nada.
 */

/**
 * Cuánto se espera entre clic y clic antes de olvidarse de la cuenta.
 *
 * Eran 900 ms y se quedaban cortos: tres clics seguidos con el ratón, sobre un
 * blanco pequeño y en la esquina de la pantalla, se van fácil de ahí. Nadie hace
 * tres clics sin querer en segundo y medio tampoco, así que el gesto sigue
 * separado del accidente y deja de fallar por poco.
 */
const CLICK_WINDOW_MS = 1600;

/** Cuánto se queda el código antes de volver a ser un reloj. */
const MORSE_MS = 9000;

const CLICKS = 3;

export default function SystemClock() {
    const hora = useClock();
    const { v02 } = useSystemState();
    const t = useT();

    const [morse, setMorse] = useState<string | null>(null);

    const clicks = useRef(0);
    const olvidar = useRef<ReturnType<typeof setTimeout> | null>(null);
    const volver = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (olvidar.current) clearTimeout(olvidar.current);
            if (volver.current) clearTimeout(volver.current);
        },
        []
    );

    const alHacerClic = useCallback(() => {
        // EN LA v0.2 EL RELOJ ES UN RELOJ Y NADA MÁS.
        //
        // El morse es la PUERTA: sirve para entrar. Una vez dentro no pinta
        // nada, y seguir enseñándolo daría a entender que hay otra cosa detrás
        // — cuando lo que hay detrás es de donde acabás de venir.
        if (v02) return;

        if (olvidar.current) clearTimeout(olvidar.current);

        clicks.current += 1;

        if (clicks.current < CLICKS) {
            olvidar.current = setTimeout(() => {
                clicks.current = 0;
            }, CLICK_WINDOW_MS);
            return;
        }

        clicks.current = 0;
        setMorse(sessionMorse());

        // Sacarlo YA cuenta. Descifrarlo es otro hallazgo aparte (`v02`): quien
        // llegó hasta acá encontró algo, aunque no sepa todavía qué es.
        markSecretFound('morse');

        if (volver.current) clearTimeout(volver.current);
        volver.current = setTimeout(() => setMorse(null), MORSE_MS);
        // `v02` en las dependencias, no vacías: sin él el callback se queda con
        // el valor que hubiera al montar, y entrar en la v0.2 sin recargar
        // dejaría el morse funcionando dentro. Lo cazó el compilador de React.
    }, [v02]);

    return (
        <span
            className={`system-clock${morse ? ' is-morse' : ''}`}
            data-testid="system-clock"
            onClick={alHacerClic}
            // No es un botón ni es enfocable: es el reloj. Un objetivo de
            // teclado acá anunciaría que hay algo, y lo que hay es un secreto.
            // Quien navega con lector de pantalla oye la hora, que es lo que
            // este hueco dice que es.
            aria-label={t('sidebar.clockLabel')}
        >
            {morse ?? hora}
        </span>
    );
}
