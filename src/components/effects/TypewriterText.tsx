// src/components/effects/TypewriterText.tsx
'use client';

import { useEffect, useState } from 'react';

interface TypewriterTextProps {
    text: string;
    /** Milisegundos por carácter. */
    speed?: number;
    /** Milisegundos que se mantiene el texto completo antes de avisar. */
    holdMs?: number;
    /** Se llama una vez terminado el texto y cumplida la espera. */
    onDone?: () => void;
}

/**
 * Escribe el texto carácter a carácter, con cursor de bloque parpadeante.
 *
 * El progreso se guarda junto al texto al que pertenece (`{ text, count }`), así
 * que al cambiar el texto no hace falta ningún efecto que reinicie el contador:
 * el render simplemente ignora un progreso que es de otro texto.
 */
export default function TypewriterText({
    text,
    speed = 45,
    holdMs = 0,
    onDone,
}: TypewriterTextProps) {
    const [progress, setProgress] = useState({ text, count: 0 });

    useEffect(() => {
        let count = 0;
        let holdTimer: ReturnType<typeof setTimeout> | undefined;

        const id = setInterval(() => {
            count += 1;
            setProgress({ text, count });

            if (count >= text.length) {
                clearInterval(id);
                if (onDone) holdTimer = setTimeout(onDone, holdMs);
            }
        }, speed);

        return () => {
            clearInterval(id);
            clearTimeout(holdTimer);
        };
        // `onDone` se deja fuera a propósito: pasar una función nueva en cada
        // render del padre reiniciaría la animación desde cero.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, speed, holdMs]);

    const count = progress.text === text ? progress.count : 0;
    const done = count >= text.length;

    return (
        <span className="mono">
            {text.slice(0, count)}
            {!done && <span className="cursor-block" aria-hidden="true" />}
        </span>
    );
}
