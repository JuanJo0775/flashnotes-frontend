// src/components/effects/ScrambleLine.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * Un nombre de comando que no se deja leer.
 *
 * En `//help`, los comandos que todavía no descubriste no salen listados ni
 * contados: salen **revolviéndose**. Las letras cambian solas, sin parar, como
 * un dato que el sistema no consigue resolver.
 *
 * POR QUÉ ANIMADO Y NO UN `[ILEGIBLE]` FIJO. Un rótulo que dice «ilegible» es la
 * app contándote que hay algo escondido; unas letras que no paran quietas SON
 * algo escondido. Lo primero se lee y se olvida, lo segundo pide que lo mires.
 *
 * CONSERVA EL LARGO del nombre de verdad, y eso es una pista real: saber que un
 * comando mide cinco letras se puede cruzar con lo que sueltan las ventanas de
 * error del fallo cromático, sin regalar nada.
 *
 * Con `prefers-reduced-motion` se queda quieto en un revuelto cualquiera: sigue
 * siendo ilegible y sigue midiendo lo mismo, sin nada moviéndose.
 */

const LETRAS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Cada cuánto cambian las letras. */
export const SCRAMBLE_MS = 90;

/**
 * Cuántas letras cambian en cada vuelta.
 *
 * NO todas: revolviéndolas enteras el bloque se lee como ruido de televisión y
 * deja de parecer texto. Cambiando unas pocas, parece una palabra que el sistema
 * está intentando resolver y no puede — que es exactamente lo que es.
 */
const CAMBIAN = 2;

function revolver(largo: number): string {
    let out = '';
    for (let i = 0; i < largo; i += 1) {
        out += LETRAS[Math.floor(Math.random() * LETRAS.length)];
    }
    return out;
}

interface Props {
    /** Cuántas letras tiene el nombre de verdad, sin el prefijo. */
    length: number;
    prefix?: string;
    /**
     * Si va DENTRO de otra cosa en vez de ocupar su renglón.
     *
     * En `//help` cada revuelto es una fila, y por eso el estilo es de bloque. En
     * la pestaña de colección va entre los corchetes del rótulo, y de bloque
     * partía el botón en TRES LÍNEAS —`[★`, el revuelto, y `]` cada uno por su
     * lado—: se leía como un botón roto, no como algo por descubrir.
     */
    inline?: boolean;
}

export default function ScrambleLine({ length, prefix = '//', inline = false }: Props) {
    const reducedMotion = usePrefersReducedMotion();
    const [texto, setTexto] = useState(() => 'x'.repeat(length));

    useEffect(() => {
        // Primer revuelto AGENDADO: hacerlo en el inicializador de `useState`
        // metería `Math.random()` en el render y el servidor pintaría una cosa y
        // el cliente otra (REGLAS · C1).
        const primero = setTimeout(() => setTexto(revolver(length)), 0);
        if (reducedMotion) return () => clearTimeout(primero);

        const id = setInterval(() => {
            setTexto((actual) => {
                const letras = actual.split('');
                for (let k = 0; k < CAMBIAN; k += 1) {
                    const i = Math.floor(Math.random() * letras.length);
                    letras[i] = LETRAS[Math.floor(Math.random() * LETRAS.length)];
                }
                return letras.join('');
            });
        }, SCRAMBLE_MS);

        return () => {
            clearTimeout(primero);
            clearInterval(id);
        };
    }, [length, reducedMotion]);

    return (
        <span
            className={inline ? 'scramble scramble-inline' : 'scramble'}
            data-testid="scramble"
        >
            {prefix}
            {texto}
        </span>
    );
}
