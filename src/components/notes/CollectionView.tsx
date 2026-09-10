// src/components/notes/CollectionView.tsx
'use client';

import { useEffect, useState, type CSSProperties } from 'react';

import { useLang } from '@/i18n';
import { useV02T } from '@/i18n/useV02T';
import { useSystemState } from '@/hooks/useSystemState';
import { v02Reading } from '@/lib/system/v02';
import { renderArtCard } from '@/lib/system/v02Card';
import {
    ART,
    ART_TOTAL,
    artOf,
    captionOf,
    forgetJustRevealed,
    justRevealed,
    readFound,
    readOpened,
    readRevealed,
} from '@/lib/system/asciiArt';

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
/**
 * UNA CASILLA DE LA COLECCIÓN, EN LA VERSIÓN VIEJA: un cuadro dibujado.
 *
 * ⚠ SE PIDIÓ DOS VECES, y la segunda con la razón exacta: «se ve muy parecida
 * a la de la 1.0». Lo estaba. Tenía el marco de guiones puesto ENCIMA de la
 * misma tarjeta —bordes de CSS, esquinas de adorno— y eso es la pantalla de
 * ahora disfrazada, no la de antes.
 *
 * Acá abajo las tarjetas no son cajas con borde: son DIBUJOS, con sus `+` en
 * las esquinas y sus `|` en los lados. Es el mismo cuadro que ya usan las notas
 * de esta versión —mismo ancho, mismo trazo— porque las dos rejillas se ven en
 * la misma pantalla y dos anchos distintos se leen como dos programas.
 *
 * ⚠ EL CUADRO ES UN DIBUJO, ASÍ QUE VA `aria-hidden`, y al lado va lo que hay
 * que oír: el número y el estado. Cuarenta y seis guiones leídos uno a uno no
 * son una casilla — es la misma decisión que ya tomó la tarjeta de nota.
 */
function CasillaVieja({
    ficha,
    art,
    pie,
    nueva = false,
    turno = 0,
    marca,
}: {
    ficha: string;
    art: string;
    pie: string;
    nueva?: boolean;
    turno?: number;
    marca?: string;
}) {
    const filas = renderArtCard({ title: ficha, art, foot: pie, clave: ficha });

    return (
        <li
            className={`v02-slot${nueva ? ' art-tune' : ''}`}
            style={nueva ? ({ '--pieza': turno } as CSSProperties) : undefined}
            data-testid={marca}
        >
            <pre aria-hidden="true">{filas.join('\n')}</pre>
            <span className="sr-only">
                {ficha}{pie ? ` · ${pie}` : ''}
            </span>
        </li>
    );
}

export default function CollectionView() {
    /*
     * ⚠ EL TRADUCTOR AVERIADO, NO EL NORMAL. Ésta era la ÚNICA vista que no
     * se enteraba de estar en la versión de antes: el lateral, la lista, la
     * papelera y la pantalla de carga sacan sus rótulos por `useV02T` —una de
     * cada cuatro etiquetas sale sin traducir, a medio hacer o mal traducida—
     * y ésta los sacaba impecables. Una pantalla perfecta dentro de una
     * versión rota no se lee como una pantalla que se salvó: se lee como una
     * sección a medio hacer.
     *
     * Fuera de la v0.2 es exactamente `useT()`, así que la v1.0 no cambia.
     */
    const t = useV02T();
    const lang = useLang();
    const { v02 } = useSystemState();

    // Se lee en el render y no se guarda en estado: esta vista se monta al abrir
    // la pestaña, y en ese momento lo revelado ya está decidido.
    const vistas = readRevealed();

    /*
     * Y CUÁLES ACABA DE DESTAPAR EL ÚLTIMO `//art`.
     *
     * ⚠ SE COPIAN AL MONTAR Y SE GASTAN. La lista vive en memoria hasta el
     * siguiente `//art`, así que leyéndola a secas una pieza seguía
     * sintonizándose CADA VEZ que abrías la pestaña — y algo que pasa siempre no
     * es una novedad, es un adorno.
     *
     * Se copia en el primer render —`useState` con función, que corre una sola
     * vez— y el efecto se la lleva. La pantalla las enseñó: ya no son nuevas.
     */
    const [nuevas] = useState(() => new Set(justRevealed()));

    useEffect(() => {
        forgetJustRevealed();
    }, []);

    /*
     * LO QUE YA ES TUYO AUNQUE NO LO HAYAS MIRADO.
     *
     * ⚠ SE PIDIÓ JUGANDO, y venía de una confusión razonable: «si ejemplo ganaste
     * la 2/16 no te sale sólo 2/16, sino algo como que hay arte en camino».
     * Ganar no revela —eso sigue pidiendo `//art`, y es lo que hace que el
     * comando sirva para algo— pero la casilla puede decir que ahí hay algo TUYO
     * sin enseñar qué es. La diferencia entre «no tengo la 2» y «tengo la 2 y no
     * la miré» es información que ya te ganaste.
     *
     * Y las abiertas, para la estrella de abajo.
     */
    const ganadas = readFound();
    const abiertas = readOpened();

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

            {/*
                LA ESTRELLA DE HABERLAS ABIERTO TODAS.

                ⚠ ABRIRLAS TODAS NO ES TENERLAS TODAS, y por eso es esto y no la
                cuenta de arriba: ganar una pieza es tropezarse con ella,
                revelarla es ir a mirar, y abrirla con `//art_<n>` es lo único
                que hay que hacer UNA POR UNA. Quien las abrió todas es el único
                que sabe cómo se llaman las dieciséis.
            */}
            {abiertas.size >= ART_TOTAL && (
                <p
                    className="collection-all-open mono text-xs"
                    data-testid="collection-all-open"
                >
                    {t('collection.allOpen')}
                </p>
            )}

            {vistas.size === 0 && (
                <p className="collection-empty mono text-sm dim">
                    {t('collection.empty')}
                </p>
            )}

            {/* La rejilla de la versión vieja es la MISMA que la de sus
                notas: cuadros dibujados sueltos, no una cuadrícula. */}
            <ul className={v02 ? 'v02-grid' : 'collection-grid'}>
                {ART.map((piece, i) => {
                    const numero = i + 1;
                    const ficha = `${numero}/${ART_TOTAL}`;

                    if (!vistas.has(piece.id)) {
                        // Y en la versión vieja, el hueco también es un cuadro.
                        if (v02)
                            return (
                                <CasillaVieja
                                    key={piece.id}
                                    ficha={ficha}
                                    art=""
                                    pie={ganadas.has(piece.id) ? t('collection.waiting') : ''}
                                    marca="collection-slot-empty"
                                />
                            );

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

                                {/*
                                    ⚠ Y SI YA ES TUYA, LO DICE. No cuál es, no
                                    su dibujo: que está esperándote. Sin esto,
                                    una pieza ganada y otra que no tenés se ven
                                    exactamente igual, y el premio se queda
                                    escondido detrás de un comando que no sabés
                                    que hay que teclear.
                                */}
                                {ganadas.has(piece.id) && (
                                    <span
                                        className="collection-waiting mono text-2xs"
                                        data-testid="collection-waiting"
                                    >
                                        {t('collection.waiting')}
                                    </span>
                                )}
                            </li>
                        );
                    }

                    /*
                        ⚠ EL ÍNDICE ES ENTRE LAS NUEVAS, no en la rejilla. Si
                        fuera el de la cuadrícula, una pieza nueva en la casilla
                        catorce esperaría a que pasaran catorce turnos que nadie
                        está mirando. Lo que se escalona es lo que llega.
                    */
                    const esNueva = nuevas.has(piece.id);
                    /*
                        CÓMO LE SALE ESTA PIEZA A LA VERSIÓN VIEJA.

                        Cuatro maneras y no una: se lee bien, se lee comida,
                        se corta a media carga, o no se abre. Con un solo
                        fallo la pantalla se leía como una función apagada;
                        lo que la hace parecer un formato que no encaja es
                        que cada pieza falle a SU manera. Ver `v02ArtMode`.
                    */
                    const lectura = v02
                        ? v02Reading(artOf(piece), piece.id)
                        : { modo: 'ok' as const, art: artOf(piece) };
                    const ilegible = lectura.modo === 'ilegible';
                    const turno = esNueva
                        ? ART.filter((p) => nuevas.has(p.id)).indexOf(piece)
                        : 0;

                    /*
                        Y EL PIE DEL CUADRO DICE EN QUÉ ESTADO ESTÁ: el nombre
                        si se pudo leer, y si no, por qué no.
                    */
                    const pie = ilegible
                        ? t('collection.unreadable')
                        : lectura.modo === 'parcial'
                          ? t('collection.partial')
                          : captionOf(piece, lang);

                    if (v02)
                        return (
                            <CasillaVieja
                                key={piece.id}
                                ficha={ficha}
                                art={lectura.art}
                                pie={pie}
                                nueva={esNueva}
                                turno={turno}
                                marca={
                                    ilegible
                                        ? 'collection-unreadable'
                                        : lectura.modo === 'parcial'
                                          ? 'collection-partial'
                                          : esNueva
                                            ? 'collection-new'
                                            : undefined
                                }
                            />
                        );

                    return (
                        <li
                            key={piece.id}
                            className={`collection-card${esNueva ? ' art-tune' : ''}`}
                            style={
                                esNueva
                                    ? ({ '--pieza': turno } as CSSProperties)
                                    : undefined
                            }
                            data-testid={esNueva ? 'collection-new' : undefined}
                        >
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
                            {/*
                                ⚠ Y LA VERSIÓN VIEJA NO SABE LEERLAS TODAS.

                                La colección la inventó la v1.0: son piezas
                                guardadas en un formato que esta versión no
                                conoce, y que las leyera TODAS perfectamente
                                era lo raro. Una de cada cuatro —siempre las
                                mismas, decididas por la pieza y no por el
                                repintado— sale como lo que es acá abajo: un
                                sector que no se puede leer.

                                ⚠ NO SE PIERDE NADA Y SE COMPRUEBA SOLO: la
                                pieza sigue entera y basta con volver a la
                                v1.0 para verla. Se rompe la pintura, no tus
                                datos — la primera regla de esta versión.
                            */}
                            {ilegible ? (
                                <p
                                    className="collection-art collection-name mono text-2xs"
                                    data-testid="collection-unreadable"
                                >
                                    {t('collection.unreadable')}
                                </p>
                            ) : (
                                <pre className="collection-art">{lectura.art}</pre>
                            )}

                            {/* Y la que se cortó lo dice, porque si no se lee
                                como una pieza que es así de pequeña. */}
                            {lectura.modo === 'parcial' && (
                                <p
                                    className="collection-name mono text-2xs"
                                    data-testid="collection-partial"
                                >
                                    {t('collection.partial')}
                                </p>
                            )}
                            {/* ⚠ Y EL PIE SALE DE `captionOf`, POR LO MISMO.
                                Acá se enseñaba el pie de TODO lo revelado, así
                                que un solo `//art` decía qué era cada pieza y
                                `//art_<n>` se quedaba sin nada que dar. Tenerla
                                no es haberla mirado, y haberla mirado no es
                                saber qué es. */}
                            {/* Y sin dibujo no hay pie: lo que no se lee no
                                se lee entero, y lo que se cortó ya dijo lo
                                suyo. */}
                            {lectura.modo === 'ok' && (
                                <p className="collection-name mono text-2xs">
                                    {captionOf(piece, lang)}
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
