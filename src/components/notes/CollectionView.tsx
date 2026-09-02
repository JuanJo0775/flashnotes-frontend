// src/components/notes/CollectionView.tsx
'use client';

import { useT } from '@/i18n';
import { ART_TOTAL } from '@/lib/system/asciiArt';
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

            {pieces.length === 0 ? (
                <p className="collection-empty mono text-sm dim">
                    {t('collection.empty')}
                </p>
            ) : (
                <ul className="collection-grid">
                    {pieces.map((p) => {
                        // La nota guarda el dibujo y su pie separados por una
                        // línea en blanco. En la tarjeta van aparte: el dibujo
                        // manda el ancho y el pie se ajusta debajo, en vez de
                        // estirar la tarjeta hasta salirse.
                        const [art, pie] = p.content.split('\n\n-- ');

                        return (
                            <li key={p._id} className="collection-card">
                                {/* El dibujo entero, sin recortar: una pieza
                                    cortada a tres líneas no es una pieza. */}
                                <pre className="collection-art">{art}</pre>
                                <p className="collection-name mono text-2xs">
                                    {pie ?? p.title}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
