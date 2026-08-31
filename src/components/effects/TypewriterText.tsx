// src/components/effects/TypewriterText.tsx
'use client';

import { useEffect, useState } from 'react';

interface TypewriterTextProps {
    text: string;
    /** Milisegundos por carácter. */
    speed?: number;
}

/**
 * Escribe el texto carácter a carácter.
 *
 * El progreso se guarda junto al texto al que pertenece (`{ text, count }`), así
 * que al cambiar el texto no hace falta ningún efecto que reinicie el contador:
 * el render simplemente ignora un progreso que es de otro texto. La versión
 * anterior encadenaba tres efectos —avanzar, reiniciar y avisar del final— y
 * cada cambio provocaba una cascada de renders.
 */
export default function TypewriterText({ text, speed = 45 }: TypewriterTextProps) {
    const [progress, setProgress] = useState({ text, count: 0 });

    useEffect(() => {
        let count = 0;
        const id = setInterval(() => {
            count += 1;
            setProgress({ text, count });
            if (count >= text.length) clearInterval(id);
        }, speed);

        return () => clearInterval(id);
    }, [text, speed]);

    const count = progress.text === text ? progress.count : 0;
    const done = count >= text.length;

    return (
        <span className="mono">
            {text.slice(0, count)}
            {!done && <span className="cursor-block" aria-hidden="true" />}
        </span>
    );
}
