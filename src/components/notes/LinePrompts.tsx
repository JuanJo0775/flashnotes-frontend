// src/components/notes/LinePrompts.tsx
'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Marca con `>` el comienzo de cada línea escrita.
 *
 * La regla es la de una terminal: el prompt marca una línea que vos empezaste.
 *
 *   > una línea corta                        ← lleva prompt
 *   > una línea tan larga que el editor la
 *     parte sola al llegar al borde          ← ES la misma línea: sin prompt
 *                                            ← línea vacía: sin prompt
 *   > otra línea                             ← lleva prompt
 *
 * La PRIMERA línea es la excepción: lleva prompt siempre, aunque esté vacía. Es
 * el prompt del editor, lo que dice dónde se empieza a escribir.
 *
 * CÓMO SE ALINEA
 *
 * No se mide nada. Debajo del textarea se dibuja una copia del texto con la
 * misma tipografía, el mismo ancho y el mismo relleno, en color transparente.
 * Cada línea lógica es un bloque y el `>` lo pone un ::before dentro del relleno
 * izquierdo. Como la copia se parte exactamente igual que el original, cada
 * prompt cae solo en su sitio.
 *
 * La primera versión hacía lo contrario: medía las posiciones con un espejo
 * oculto y las aplicaba a mano. Se desincronizaba de tres maneras distintas
 * —`requestAnimationFrame` suspendido con la pestaña en segundo plano, la
 * tipografía aplicándose después de haber medido, y el ancho cambiando al
 * aparecer la barra de desplazamiento— y dejaba prompts clavados fuera de la
 * vista, sin forma de recuperarse. Alineando por maquetado en vez de por
 * aritmética, los tres casos desaparecen de raíz.
 */

interface LinePromptsProps {
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    /** Texto actual del editor. */
    value: string;
}

/** Espacio de ancho cero, para que una línea vacía ocupe fila igual. */
const ESPACIO_INVISIBLE = '\u200b';

export default function LinePrompts({ textareaRef, value }: LinePromptsProps) {
    const trackRef = useRef<HTMLDivElement | null>(null);

    // La copia acompaña al scroll del textarea. El transform se escribe
    // directamente sobre el nodo: hacerlo por estado repintaría React en cada
    // fotograma del scroll.
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;

        const sincronizar = () => {
            if (trackRef.current) {
                trackRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
            }
        };

        sincronizar();
        ta.addEventListener('scroll', sincronizar, { passive: true });
        return () => ta.removeEventListener('scroll', sincronizar);
    }, [textareaRef, value]);

    const lineas = value.split('\n');

    return (
        <div className="editor-prompts" aria-hidden="true">
            <div ref={trackRef} className="editor-prompts-track">
                {lineas.map((linea, i) => (
                    <div
                        key={i}
                        className={
                            i === 0 || linea.length > 0
                                ? 'editor-line has-prompt'
                                : 'editor-line'
                        }
                    >
                        {linea.length > 0 ? linea : ESPACIO_INVISIBLE}
                    </div>
                ))}
            </div>
        </div>
    );
}
