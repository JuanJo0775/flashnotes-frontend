// src/components/notes/CollectionView.tsx
'use client';

import { useLang, useT } from '@/i18n';
import {
    ART,
    ART_TOTAL,
    artOf,
    captionKnown,
    readRevealed,
} from '@/lib/system/asciiArt';
import { UNNAMED } from '@/lib/system/asciiArt';

/**
 * Las piezas que te ganaste, y que además fuiste a mirar.
 *
 * ES UN CATÁLOGO, CON SUS OCHO HUECOS. Enseñar sólo lo que tenés, apilado, no
 * deja ver CUÁL acabás de encontrar ni cuáles faltan — y lo que hace coleccionar
 * es ver el sitio vacío. Cada pieza cae en el suyo: la nº 6 está siempre en el
 * mismo hueco, la tengas o no.
 *
 * ⚠ NO SALE DE LAS NOTAS. Antes se construía con las notas que `//keep` había
 * marcado, y eso ataba la colección a haber guardado una copia. Ahora sale
 * directamente de las piezas: `//keep` es sólo para llevarse una a una nota y
 * trastear con ella, y la colección no se entera.
 *
 * ⚠ Y SÓLO LO REVELADO. Ganar una pieza no la pone acá: hay que teclear `//art`
 * para verla. Si brotara sola, el comando no serviría para nada — sabrías lo que
 * tenés sin preguntar. Así, encontrar una deja una pregunta abierta hasta que vas
 * a mirar.
 */
export default function CollectionView() {
    const t = useT();
    const lang = useLang();

    // Se lee en el render y no se guarda en estado: esta vista se monta al abrir
    // la pestaña, y en ese momento lo revelado ya está decidido.
    const vistas = readRevealed();

    return (
        <section className="collection-view" aria-label={t('collection.title')}>
            {/* ⚠ EL MISMO RÓTULO QUE NOTAS Y PAPELERA, con sus clases y todo.
                Tenía uno propio —`collection-header` con `section-title`— y se
                veía distinto: otra letra, otro tamaño, sin la línea de abajo. Tres
                vistas hermanas con tres cabeceras distintas se leen como tres
                aplicaciones, no como tres pestañas de la misma. */}
            <h2 className="section-header flex items-baseline justify-between gap-4">
                <span>{t('collection.title')}</span>
                <span
                    className="mono text-xs text-meta tabular-nums"
                    data-testid="collection-count"
                >
                    {vistas.size}/{ART_TOTAL}
                </span>
            </h2>

            {vistas.size === 0 && (
                <p className="collection-empty mono text-sm dim">
                    {t('collection.empty')}
                </p>
            )}

            <ul className="collection-grid">
                {ART.map((piece, i) => {
                    const numero = i + 1;
                    const ficha = `${numero}/${ART_TOTAL}`;

                    if (!vistas.has(piece.id)) {
                        return (
                            <li
                                key={piece.id}
                                className="collection-card is-empty"
                                data-testid="collection-slot-empty"
                            >
                                {/* El hueco lleva su número y nada más. Un nombre
                                    o una silueta dirían QUÉ falta, y lo que tiene
                                    que decir es CUÁNTO. */}
                                <span className="collection-slot mono">{ficha}</span>
                            </li>
                        );
                    }

                    return (
                        <li key={piece.id} className="collection-card">
                            {/* El número, arriba y a la vista: es lo que convierte
                                «tengo una pieza» en «tengo la 6». */}
                            <span className="collection-num mono text-2xs dim">
                                {ficha}
                            </span>
                            {/* El dibujo entero, sin recortar: una pieza cortada a
                                tres líneas no es una pieza.

                                ⚠ Y SALE DE `artOf`, NO DE `piece.art`. Las piezas
                                con nombre por ganar se enseñan A MEDIO RECUPERAR
                                —el manipulador, hasta que usás el código para
                                entrar y salir de la v0.2— y acá se pintaba el
                                dibujo entero mientras el catálogo lo tapaba: dos
                                sitios contando cosas distintas de la misma
                                pieza. */}
                            <pre className="collection-art">{artOf(piece)}</pre>
                            <p className="collection-name mono text-2xs">
                                {captionKnown(piece) ? piece.caption[lang] : UNNAMED}
                            </p>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
