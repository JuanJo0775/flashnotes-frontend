// src/components/effects/CommandRows.tsx
'use client';

import { useEffect, useState } from 'react';
import { useEvent } from '@/hooks/useEvent';
import ScrambleLine from '@/components/effects/ScrambleLine';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { ReplyRow } from '@/lib/system/commands';

/**
 * Una respuesta que no es sólo texto.
 *
 * La usa `//help`, donde los comandos que todavía no descubriste ocupan SU SITIO
 * en la lista y se pintan revolviéndose. Las filas normales se revelan una a una,
 * como un listado saliendo por una terminal, en vez de letra a letra: para una
 * lista, la línea es la unidad que se lee.
 *
 * DESCUBRIR UNO NO LO AÑADE: destapa el hueco que ya tenía. Por eso el orden es
 * el canónico y no «primero los conocidos». Agrupándolos se veía de un vistazo
 * cuáles eran nuevos, que es contar de más.
 */

/** Cada cuánto sale una fila. */
export const ROW_MS = 45;

interface Props {
    rows: readonly ReplyRow[];
    /** Cuánto se queda entero antes de irse. */
    holdMs: number;
    onDone: () => void;
}

export default function CommandRows({ rows, holdMs, onDone }: Props) {
    /*
     * ⚠ LA IDENTIDAD SE FIJA ACÁ, y esto arregla un fallo reportado dos veces:
     * «la animación de reiniciar queda congelada en algunos momentos».
     *
     * El padre pasa una flecha escrita en el JSX —una función NUEVA en cada
     * render— y la página repinta sola por lo menos una vez por segundo, porque
     * hay un reloj en la barra de estado. Con `onDone` en las dependencias, cada
     * repintado desarmaba el temporizador del tramo y lo volvía a armar desde
     * cero: un tramo más largo que un segundo NO TERMINABA NUNCA.
     *
     * Por eso pasaba «a veces» — la duración se sortea, y sólo se congelaba
     * cuando el tramo salía largo. Ver `useEvent`.
     */
    const avisar = useEvent(onDone);

    const reducedMotion = usePrefersReducedMotion();
    const [visibles, setVisibles] = useState(reducedMotion ? rows.length : 0);

    useEffect(() => {
        if (reducedMotion) return;

        let i = 0;
        const id = setInterval(() => {
            i += 1;
            setVisibles(i);
            if (i >= rows.length) clearInterval(id);
        }, ROW_MS);

        return () => clearInterval(id);
    }, [rows.length, reducedMotion]);

    // Se va sola, como todas las respuestas: que la terminal se limpie y deje la
    // nota en blanco es parte de cómo se siente.
    useEffect(() => {
        const salida = rows.length * ROW_MS + holdMs;
        const id = setTimeout(avisar, salida);
        return () => clearTimeout(id);
    }, [rows.length, holdMs, avisar]);

    return (
        <span className="mono">
            {rows.slice(0, visibles).map((fila, i) =>
                'text' in fila ? (
                    <span key={i} className="reply-row">
                        {fila.text || '\u00a0'}
                    </span>
                ) : (
                    <ScrambleLine key={i} length={fila.scramble} prefix={fila.prefix} />
                )
            )}
        </span>
    );
}
