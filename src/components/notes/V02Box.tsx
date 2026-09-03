// src/components/notes/V02Box.tsx
'use client';

import type { ReactNode } from 'react';

/**
 * Una caja DIBUJADA con caracteres, de cualquier tamaño.
 *
 * En la v0.2 no hay bordes: hay guiones y barras. Pero un marco de caracteres
 * tiene un problema que un `border` no tiene — **no sabe cuánto mide la caja**.
 *
 * LA SOLUCIÓN: se emiten muchos más caracteres de los que caben y se recorta.
 * El lado de arriba son cuatrocientos guiones dentro de un `overflow: hidden`;
 * el de la izquierda, doscientas barras. Cada uno llena lo que haya y lo que
 * sobra se corta. Las esquinas van colocadas encima, en su sitio exacto.
 *
 * Así el marco se adapta a cualquier ancho y alto **sin medir nada en
 * ejecución** y sin que se le note el truco: lo que se ve son caracteres de
 * verdad, alineados a la rejilla de la monoespaciada.
 *
 * Todo el marco lleva `aria-hidden`: quien escucha no necesita que le lean
 * cuatrocientos guiones. El contenido va aparte y se anuncia solo.
 */

/** De sobra para cualquier pantalla, y barato: es una cadena. */
const ANCHO = 400;
const ALTO = 200;

const HORIZONTAL = '-'.repeat(ANCHO);
const VERTICAL = Array.from({ length: ALTO }, () => '|').join('\n');

interface Props {
    children: ReactNode;
    /** Se mete en el marco de arriba, como una etiqueta pegada a la caja. */
    title?: string;
    className?: string;
}

export default function V02Box({ children, title, className = '' }: Props) {
    return (
        <div className={`v02-box ${className}`.trimEnd()}>
            <span className="v02-box-h v02-box-top" aria-hidden="true">
                {HORIZONTAL}
            </span>
            <span className="v02-box-h v02-box-bottom" aria-hidden="true">
                {HORIZONTAL}
            </span>
            <span className="v02-box-v v02-box-left" aria-hidden="true">
                {VERTICAL}
            </span>
            <span className="v02-box-v v02-box-right" aria-hidden="true">
                {VERTICAL}
            </span>

            {/* Las cuatro esquinas, encima de los lados. Sin ellas el marco se
                lee como cuatro rayas sueltas y no como una caja. */}
            <span className="v02-corner v02-corner-tl" aria-hidden="true">+</span>
            <span className="v02-corner v02-corner-tr" aria-hidden="true">+</span>
            <span className="v02-corner v02-corner-bl" aria-hidden="true">+</span>
            <span className="v02-corner v02-corner-br" aria-hidden="true">+</span>

            {title && (
                <span className="v02-box-title" aria-hidden="true">
                    {` ${title} `}
                </span>
            )}

            <div className="v02-box-inner">{children}</div>
        </div>
    );
}
