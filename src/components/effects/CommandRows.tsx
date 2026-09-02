// src/components/effects/CommandRows.tsx
'use client';

import { useEffect, useState } from 'react';
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
        const id = setTimeout(onDone, salida);
        return () => clearTimeout(id);
    }, [rows.length, holdMs, onDone]);

    return (
        <span className="mono">
            {rows.slice(0, visibles).map((fila, i) =>
                'text' in fila ? (
                    <span key={i} className="reply-row">
                        {fila.text || '\u00a0'}
                    </span>
                ) : (
                    <ScrambleLine key={i} length={fila.scramble} />
                )
            )}
        </span>
    );
}
