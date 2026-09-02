// src/components/effects/BootPrompt.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * Secuencia de arranque del editor, al abrir una nota vacía.
 *
 * Tiene un arco completo, no sólo una entrada:
 *
 *   1. DESPERTAR   el cursor de bloque parpadea solo un momento
 *   2. TECLEO      el texto de ayuda se escribe carácter a carácter
 *   3. PAUSA       se mantiene lo justo para leerlo
 *   4. BORRADO     se borra hacia atrás, más rápido de lo que se escribió
 *   5. REPOSO      queda el cursor parpadeando, listo para escribir
 *
 * El borrado es lo que hace que la cosa cierre: la primera versión tecleaba el
 * texto y lo hacía desaparecer de golpe, así que el detalle se evaporaba sin
 * explicar a dónde se había ido. Borrándose, el mismo cursor que escribió el
 * texto se queda esperándote — que es exactamente lo que hace una terminal.
 *
 * Mientras dura, el textarea lleva el cursor real oculto y el que se ve es
 * este; los dos son bloques del mismo tamaño, así que el relevo no se nota.
 */

const WAKE_MS = 320; // parpadeo antes de empezar
const TYPE_MS = 24; // por carácter al escribir
const HOLD_MS = 620; // pausa con el texto completo
const ERASE_MS = 11; // por carácter al borrar

interface BootPromptProps {
    text: string;
    /** Parpadeo antes de empezar. */
    wakeMs?: number;
    /** Milisegundos por carácter al escribir. */
    typeMs?: number;
    /** Pausa con el texto completo. */
    holdMs?: number;
    /** Milisegundos por carácter al borrar. */
    eraseMs?: number;
    /**
     * Escribe el texto y SE QUEDA: sin pausa, sin borrado y sin avisar.
     *
     * Lo piden las respuestas que hay que poder LEER. `//help` lista quince
     * comandos y no entra en el hueco del editor; borrándose sola a los nueve
     * segundos, había que leerla y desplazarla contra reloj, así que en la
     * práctica no se podía leer. Quien la monta decide cuándo se va.
     */
    persist?: boolean;
    /** Se llama una vez, al cerrar el arco. No se llama si se cancela. */
    onDone?: () => void;
}

export default function BootPrompt({
    text,
    wakeMs = WAKE_MS,
    typeMs = TYPE_MS,
    holdMs = HOLD_MS,
    eraseMs = ERASE_MS,
    persist = false,
    onDone,
}: BootPromptProps) {
    const [count, setCount] = useState(0);
    const reducedMotion = usePrefersReducedMotion();

    // `onDone` va por ref: si entrara en las dependencias del efecto, un padre
    // que pasara una función nueva en cada render reiniciaría el tecleo desde
    // cero en mitad de la animación.
    const onDoneRef = useRef(onDone);
    useEffect(() => {
        onDoneRef.current = onDone;
    }, [onDone]);

    useEffect(() => {
        // Quien pide menos movimiento ve el texto quieto, sin secuencia.
        if (reducedMotion) return;

        let cancelled = false;
        const timers: ReturnType<typeof setTimeout>[] = [];
        const wait = (ms: number) =>
            new Promise<void>((resolve) => {
                timers.push(setTimeout(resolve, ms));
            });

        void (async () => {
            await wait(wakeMs);

            for (let i = 1; i <= text.length; i += 1) {
                if (cancelled) return;
                setCount(i);
                await wait(typeMs);
            }

            // Escrito y quieto: el arco no se cierra porque no tiene final.
            if (persist) return;

            await wait(holdMs);

            for (let i = text.length - 1; i >= 0; i -= 1) {
                if (cancelled) return;
                setCount(i);
                await wait(eraseMs);
            }

            // Sólo al cerrar el arco entero: si se canceló a mitad, quien lo
            // montó ya decidió otra cosa y no hay nada que avisar.
            if (!cancelled) onDoneRef.current?.();
        })();

        return () => {
            cancelled = true;
            timers.forEach(clearTimeout);
        };
    }, [text, reducedMotion, wakeMs, typeMs, holdMs, eraseMs, persist]);

    return (
        <span className="mono">
            {reducedMotion ? text : text.slice(0, count)}
            {!reducedMotion && <span className="cursor-block" aria-hidden="true" />}
        </span>
    );
}
