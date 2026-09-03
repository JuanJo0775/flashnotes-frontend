// src/components/effects/GlitchLayer.tsx
'use client';

import { useEffect } from 'react';
import { useGlitch, fireGlitch, nextGlitchDelayMs } from '@/hooks/useGlitch';
import { useSystemState } from '@/hooks/useSystemState';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { ChromaSplitFilters } from '@/components/effects/ChromaticFailure';

/**
 * El fallo ambiental: las franjas y el negativo.
 *
 * El tirón NO se pinta acá — lo da el contenedor de la app, que es lo que tiene
 * que moverse. Este componente sólo aporta las capas que van por encima y el
 * temporizador que dispara todo.
 *
 * CUÁNDO NO SE PROGRAMA NADA:
 *  · con los efectos apagados (`>chaos off` o el interruptor del panel)
 *  · con `prefers-reduced-motion`: la regla manda sobre cualquier efecto
 *  · con la pestaña oculta: un fallo que nadie ve es sólo un temporizador
 *    gastando batería, y además se acumularían todos al volver
 *
 * El intervalo se acorta con lo que lleve abierta la pestaña: la máquina se
 * cansa mientras la usás (ver `glitchTiming`).
 */
/**
 * El ritmo de los tirones mientras la señal está rota.
 *
 * Entre 2,5 y 9 segundos, irregular: una pantalla averiada da saltos cuando se
 * le antoja, no a compás.
 */
const FAILURE_MIN_MS = 2500;
const FAILURE_SPREAD_MS = 6500;

export default function GlitchLayer() {
    const glitch = useGlitch();
    const { effectsEnabled, chromaticFailure, lockedOut } = useSystemState();
    const reducedMotion = usePrefersReducedMotion();

    // Con la señal rota los fallos NO se apagan: se aceleran. Una pantalla ya
    // averiada que encima deja de dar tirones se ve extrañamente estable.
    const dormido = !effectsEnabled || reducedMotion;
    // El bloqueo cuenta igual que la señal rota: es el estado MÁS crítico, y
    // dejarlo quieto sería el sitio donde menos sentido tiene.
    const acelerado = chromaticFailure || lockedOut;

    useEffect(() => {
        if (dormido) return;

        let timer: ReturnType<typeof setTimeout> | null = null;

        const programar = () => {
            timer = setTimeout(() => {
                // Con la pestaña oculta se salta el turno y se vuelve a
                // programar: nada se acumula para dispararse de golpe al volver.
                if (document.visibilityState === 'visible') fireGlitch();
                programar();
                // Durante la avería el ritmo NO se deriva del de reposo: se
                // reemplaza. Dividir el intervalo ambiental por tres seguía
                // dando más de un minuto entre tirones, y en una pantalla que ya
                // está rota eso se siente como que no pasa nada. Acá caen cada
                // pocos segundos, e irregulares, para que salten por ahí en vez
                // de latir.
            }, acelerado ? FAILURE_MIN_MS + Math.random() * FAILURE_SPREAD_MS : nextGlitchDelayMs());
        };

        programar();

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [dormido, acelerado]);

    if (!glitch.active) return null;

    const serio = glitch.severity !== 'minor';

    return (
        <div className={lockedOut ? 'is-locked' : undefined}>
            <div className="glitch-bands" aria-hidden="true" />

            {/* Las franjas desplazadas: cada una recorta lo que hay detrás y lo
                corre de lado. Es lo que más "señal rota" comunica de todo el
                conjunto, y por eso se reserva a los fallos que ya son serios. */}
            {glitch.slices.map((slice, i) => (
                <div
                    key={i}
                    className="glitch-slice"
                    aria-hidden="true"
                    style={
                        {
                            top: `${slice.topPct}%`,
                            height: `${slice.heightPct}%`,
                            '--slice-shift': `${slice.shiftPx}px`,
                        } as React.CSSProperties
                    }
                />
            ))}

            {/* La caída de nivel es lo que ata a las demás: sin ella las
                rebanadas parecen recortes; con ella, una imagen perdiéndose. */}
            {serio && <div className="glitch-level" aria-hidden="true" />}

            {/* La ráfaga necesita el filtro publicado: con la señal sana nadie
                lo puso en el DOM todavía. */}
            {glitch.chromaBurst && <ChromaSplitFilters />}

            {glitch.negative && <div className="glitch-negative" aria-hidden="true" />}
        </div>
    );
}
