// src/components/notes/CollectionView.tsx
'use client';

import { useT } from '@/i18n';
import { ART_TOTAL, artSlots } from '@/lib/system/asciiArt';
import type { Note } from '@/types/note.types';

/**
 * Las piezas guardadas con `//keep`.
 *
 * NO SE TRATAN COMO NOTAS, y ésa es toda la pieza. No las escribiste, no se
 * editan y no tienen por qué estorbar entre tus archivos: no se abren en el
 * editor, no llevan tamaño en bytes ni fecha de modificación, y no dicen
 * «ABRIR». Se ven, que es lo único que se hace con una colección.
 *
 * Se muestran ENTERAS y no recortadas: una pieza cortada a tres líneas no es una
 * pieza, es una nota con un dibujo dentro — que es justo lo que esta vista existe
 * para no ser.
 *
 * ES UN CATÁLOGO, CON SUS HUECOS. Antes enseñaba sólo lo que tenías, apilado, y
 * así no se sabía CUÁL de las ocho acababas de encontrar ni cuáles faltaban.
 * Ahora están los ocho sitios, numerados, y cada pieza cae en el suyo: la nº 6
 * está siempre en el mismo hueco, la tengas o no.
 *
 * Lo que hace coleccionar es ver el sitio vacío. Una lista de lo que ya tenés no
 * pide nada; ocho huecos con dos llenos, sí.
 */

interface Props {
    pieces: Note[];
}

export default function CollectionView({ pieces }: Props) {
    const t = useT();

    return (
        <section className="collection-view" aria-label={t('collection.title')}>
            <header className="collection-header">
                <h2 className="section-title">{t('collection.title')}</h2>
                <span className="mono text-xs dim" data-testid="collection-count">
                    {pieces.length}/{ART_TOTAL}
                </span>
            </header>

            {pieces.length === 0 && (
                <p className="collection-empty mono text-sm dim">
                    {t('collection.empty')}
                </p>
            )}

            <ul className="collection-grid">
                {artSlots(pieces).map(({ number, note }) => {
                    const ficha = `${number}/${ART_TOTAL}`;

                    if (note === null) {
                        return (
                            <li
                                key={number}
                                className="collection-card is-empty"
                                data-testid="collection-slot-empty"
                            >
                                {/* El hueco lleva su número y nada más. Un
                                    nombre o una silueta dirían QUÉ falta, y lo
                                    que tiene que decir es CUÁNTO. */}
                                <span className="collection-slot mono">{ficha}</span>
                            </li>
                        );
                    }

                    // La nota guarda el dibujo y su pie separados por una línea
                    // en blanco. En la tarjeta van aparte: el dibujo manda el
                    // ancho y el pie se ajusta debajo, en vez de estirar la
                    // tarjeta hasta salirse.
                    const [art, pie] = note.content.split('\n\n-- ');

                    return (
                        <li key={note._id} className="collection-card">
                            {/* El número, arriba y a la vista: es lo que
                                convierte «tengo una pieza» en «tengo la 6». */}
                            <span className="collection-num mono text-2xs dim">
                                {ficha}
                            </span>
                            {/* El dibujo entero, sin recortar: una pieza cortada
                                a tres líneas no es una pieza. */}
                            <pre className="collection-art">{art}</pre>
                            <p className="collection-name mono text-2xs">
                                {pie ?? note.title}
                            </p>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
