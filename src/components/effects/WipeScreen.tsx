// src/components/effects/WipeScreen.tsx
'use client';

import { useEffect, useState } from 'react';
import {
    wipeAt,
    wipeLine,
    WIPE_STEP_MS,
    WIPE_BLANK_MS,
    WIPE_DOTS_MS,
} from '@/lib/system/wipe';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * La pantalla que se come a sí misma.
 *
 * Las líneas se van tachando una a una, el hueco se queda vacío, salen tres
 * puntos, y vuelve el inicio. El guion entero está en `wipe.ts`, probado aparte;
 * acá sólo se le da el reloj.
 *
 * ⚠ EL BORRADO YA OCURRIÓ ANTES DE QUE ESTO SE MONTE.
 *
 * Esto es una animación, no un proceso: si los datos se fueran borrando al ritmo
 * de los fotogramas, cerrar la pestaña a mitad dejaría medio limpio y medio no.
 * Se borra de golpe y luego se cuenta — que es, además, lo que hace un `rm`
 * de verdad frente a lo que enseña una pantalla de carga.
 *
 * `prefers-reduced-motion` se salta el desfile y va directo al final (REGLAS ·
 * A3). Quien lo tiene puesto no se pierde nada: el resultado es el mismo.
 */

interface Props {
    /** Se llama al terminar. Es quien devuelve al inicio. */
    onDone: () => void;
    /** Lo que se dice al final. La broma pone acá su «era broma». */
    footer?: string;
}

export default function WipeScreen({ onDone, footer }: Props) {
    const quieto = usePrefersReducedMotion();
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (quieto) {
            const id = setTimeout(onDone, WIPE_DOTS_MS);
            return () => clearTimeout(id);
        }

        const fase = wipeAt(step);

        if (fase.kind === 'done') {
            onDone();
            return;
        }

        // Cada fase dura lo suyo: comerse una línea es rápido, el vacío y los
        // puntos necesitan aire o no se leen como una pausa.
        const espera =
            fase.kind === 'eating'
                ? WIPE_STEP_MS
                : fase.kind === 'blank'
                  ? WIPE_BLANK_MS
                  : WIPE_DOTS_MS;

        const id = setTimeout(() => setStep((n) => n + 1), espera);
        return () => clearTimeout(id);
    }, [step, quieto, onDone]);

    const fase = quieto ? { kind: 'dots' as const } : wipeAt(step);

    return (
        <div className="wipe-screen" role="status" aria-live="polite">
            {fase.kind === 'eating' && (
                <pre className="wipe-list" aria-hidden="true">
                    {fase.lines
                        .map((l, i) => wipeLine(l, i < fase.eaten))
                        .join('\n')}
                </pre>
            )}

            {fase.kind === 'dots' && (
                <pre className="wipe-dots" aria-hidden="true">
                    ...
                </pre>
            )}

            {/* El vacío no pinta nada a propósito: es la pausa, y una pausa con
                algo dentro deja de ser una pausa. */}

            {footer && fase.kind === 'dots' && (
                <p className="wipe-footer mono">{footer}</p>
            )}

            {/* Quien escucha no necesita once nombres de fichero tachándose. */}
            <span className="sr-only">{footer ?? '...'}</span>
        </div>
    );
}
