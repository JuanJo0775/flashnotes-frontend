// src/components/effects/V02Glitches.tsx
'use client';

import { useEffect } from 'react';
import { useSystemState } from '@/hooks/useSystemState';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { fireGlitch } from '@/hooks/useGlitch';

/**
 * En la v0.2, los tirones de color salen SOLOS.
 *
 * Son los mismos que da el botón secreto en la v1.0 —la separación de canales,
 * el tirón, el fantasma monocromo— pero ahí hay que ganárselos a fuerza de
 * clics. Acá aparecen sin que nadie los pida, cada tantos segundos, porque esta
 * versión todavía no sabía no hacerlo.
 *
 * Y eso es exactamente la diferencia entre las dos versiones: en la v1.0 el
 * fallo es algo que provocás; en la v0.2 es el estado normal de la casa.
 *
 * SE FUERZA `major` Y NO SE SORTEA. Con el sorteo, la mayoría caían en `minor` y
 * pasaban desapercibidos: un tirón que no se ve no cuenta como avería, cuenta
 * como nada. `major` se nota sin tapar lo que estés leyendo.
 */

/** Cada cuánto se cae solo. */
const MIN_MS = 6000;
const MAX_MS = 15_000;

export default function V02Glitches() {
    const { v02 } = useSystemState();
    const reducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        if (!v02 || reducedMotion) return;

        let timer: ReturnType<typeof setTimeout>;

        const ciclo = () => {
            timer = setTimeout(
                () => {
                    // Con la pestaña oculta no se gasta: Chrome frena los
                    // temporizadores y al volver saldrían todos de golpe.
                    if (document.visibilityState === 'visible') {
                        fireGlitch(Math.random, 'major');
                    }
                    ciclo();
                },
                MIN_MS + Math.random() * (MAX_MS - MIN_MS)
            );
        };

        ciclo();
        return () => clearTimeout(timer);
    }, [v02, reducedMotion]);

    return null;
}
