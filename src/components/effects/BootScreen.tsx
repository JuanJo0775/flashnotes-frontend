// src/components/effects/BootScreen.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    bootAt,
    bootDuration,
    bootScript,
    bootCheckLines,
    BOOT_BARS,
    BOOT_LOGO,
    BOOT_VENDOR,
} from '@/lib/system/boot';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * El monitor encendiéndose.
 *
 * El tubo se enciende, salen las barras de color, el rótulo del fabricante, la
 * comprobación de memoria, y a trabajar. Sale ANTES de la app, cada vez que se
 * carga.
 *
 * POR QUÉ SIEMPRE. Un arranque que sale una vez es una pantalla de bienvenida, y
 * una pantalla de bienvenida se salta. Uno que sale siempre es cómo ES la
 * máquina. Es lo que convierte «una app con estética de terminal» en «un equipo
 * que se enciende».
 *
 * Y TARDA DISTINTO CADA VEZ, entre dos y ocho segundos. Un equipo de verdad no
 * tarda siempre lo mismo. Un arranque cronometrado se siente como una animación;
 * uno que unas veces vuela y otras se hace de rogar se siente como una máquina.
 *
 * ⚠ NO BLOQUEA NADA. La app se monta por detrás mientras esto se ve: cuando el
 * arranque termina, ya está todo listo. Si esperara a que acabe para empezar a
 * cargar sería un peaje de verdad y no un adorno.
 *
 * `prefers-reduced-motion` lo salta entero (REGLAS · A3): detrás está exactamente
 * la misma app.
 */

interface Props {
    onDone: () => void;
}

export default function BootScreen({ onDone }: Props) {
    const quieto = usePrefersReducedMotion();
    const [step, setStep] = useState(0);

    // El dado se tira UNA vez por encendido. Sorteando en cada paso, cada tramo
    // duraría lo suyo y el arranque no tendría una duración, tendría varias.
    const guion = useMemo(() => bootScript(bootDuration()), []);

    useEffect(() => {
        if (quieto) {
            onDone();
            return;
        }

        const { phase, ms } = bootAt(guion, step);

        if (phase === 'done') {
            onDone();
            return;
        }

        const id = setTimeout(() => setStep((n) => n + 1), ms);
        return () => clearTimeout(id);
    }, [guion, step, quieto, onDone]);

    /*
     * LA APP ENTRA DESVANECIÉNDOSE cuando esto acaba.
     *
     * El atributo se pone al terminar y se queda: es lo que dispara la entrada.
     * Aparecer de golpe después de un arranque de monitor rompería justo lo que
     * el arranque acaba de construir — lo que se enciende, se enciende con una
     * imagen que se asienta.
     */
    useEffect(() => {
        const raiz = document.documentElement;
        raiz.removeAttribute('data-booted');

        return () => {
            raiz.setAttribute('data-booted', '');
        };
    }, []);

    if (quieto) return null;

    const { phase } = bootAt(guion, step);
    if (phase === 'done') return null;

    return (
        <div
            className={`boot-screen${phase === 'on' ? ' is-on' : ''}`}
            aria-hidden="true"
        >
            {/* El encendido no pinta nada: lo que se ve es el propio tubo
                abriéndose de una línea a la pantalla entera. Ponerle contenido
                lo estiraría en el momento en que se abre y se vería mal. */}

            {phase === 'bars' && (
                <div className="boot-bars">
                    {/* Con CSS y no con caracteres: los bloques no están en la
                        monoespaciada de la casa y los pintaría una fuente de
                        reserva con otras métricas (REGLAS · C8). */}
                    {BOOT_BARS.map((c) => (
                        <span key={c} style={{ background: c }} />
                    ))}
                </div>
            )}

            {phase === 'logo' && (
                <div className="boot-logo">
                    <pre>{BOOT_LOGO.join('\n')}</pre>
                    <p className="boot-vendor">{BOOT_VENDOR}</p>
                </div>
            )}

            {phase === 'check' && (
                <pre className="boot-check">{bootCheckLines().join('\n')}</pre>
            )}
        </div>
    );
}
