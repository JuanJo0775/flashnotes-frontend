// src/components/notes/V02NoteCard.tsx
'use client';

import { formatFileSize } from '@/lib/utils/formatters';
import { renderCard } from '@/lib/system/v02Card';
import type { Note } from '@/types/note.types';

/**
 * Una nota de la v0.2: un cuadro dibujado con caracteres.
 *
 * No es una caja con borde a la que se le cambió el estilo — es un DIBUJO, con
 * sus `+` en las esquinas, sus `|` en los lados y los huecos rellenos de puntos.
 * Así se hacía una tarjeta antes de que hubiera tarjetas.
 *
 * El cuadro entero sale de `renderCard`, que es puro y está probado carácter a
 * carácter. Acá sólo se pinta y se le pone el clic encima.
 */

interface Props {
    note: Note;
    onSelect: (note: Note) => void;
}

export default function V02NoteCard({ note, onSelect }: Props) {
    const filas = renderCard({
        title: note.title,
        content: note.content,
        meta: formatFileSize(note.content.length).toUpperCase(),
    });

    return (
        <button
            type="button"
            className="v02-card"
            onClick={() => onSelect(note)}
            // El cuadro es un dibujo: quien escucha necesita el título, no
            // cuarenta y seis guiones leídos uno a uno.
            aria-label={note.title}
        >
            <pre aria-hidden="true">{filas.join('\n')}</pre>
        </button>
    );
}
