// src/components/layout/Sidebar.tsx
'use client';

import { useV02T } from '@/i18n/useV02T';
import SystemClock from '@/components/layout/SystemClock';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Note } from '@/types/note.types';
import { formatFileSize } from '@/lib/utils/formatters';
import { useT } from '@/i18n';

/**
 * Cuánto se sigue pintando una fila que ya no está.
 *
 * ⚠ TIENE QUE DURAR LO QUE LA ANIMACIÓN, ni más ni menos. Menos la corta a
 * media salida; más deja un hueco fantasma ocupando sitio en una lista donde ya
 * no hay nada — y eso se ve como un fallo de maquetado, no como una hoja
 * saliendo. Ver `.row-pull` en `animations.css`.
 */
const SALIDA_MS = 180;

interface SidebarProps {
    notes: Note[];
    selectedNote: Note | null;
    total: number;
    hasMore: boolean;
    isLoadingMore: boolean;
    onSelectNote: (note: Note) => void;
    onNewNote: () => void;
    onLoadMore: () => void;
}

export default function Sidebar({
    notes,
    selectedNote,
    total,
    hasMore,
    isLoadingMore,
    onSelectNote,
    onNewNote,
    onLoadMore,
}: SidebarProps) {
    /*
     * LAS QUE SE ESTÁN YENDO.
     *
     * ⚠ UNA FILA NO PUEDE ANIMAR SU SALIDA SI YA NO ESTÁ. Cuando tirás una nota
     * desaparece de `notes` en el mismo instante, así que React la desmonta y no
     * queda nada que mover. Para enseñar que se va hay que seguir pintándola un
     * rato después de que deje de existir.
     *
     * Se guarda la lista anterior y se compara: lo que estaba y ya no, se pinta
     * 180 ms más con la clase de salida y después se suelta. Nada de esto toca
     * los datos — son filas fantasma, sin puntero y sin foco.
     */
    const [saliendo, setSaliendo] = useState<Note[]>([]);
    const anteriores = useRef<Note[]>(notes);

    useEffect(() => {
        const ahora = new Set(notes.map((n) => n._id));
        const idas = anteriores.current.filter((n) => !ahora.has(n._id));
        anteriores.current = notes;

        if (idas.length === 0) return;

        setSaliendo((previas) => [...previas, ...idas]);

        const id = setTimeout(() => {
            const idasIds = new Set(idas.map((n) => n._id));
            setSaliendo((previas) => previas.filter((n) => !idasIds.has(n._id)));
        }, SALIDA_MS);

        return () => clearTimeout(id);
    }, [notes]);
    const t = useT();
    // El traductor degradado va aparte: `useT()` trae además `t.plural`, que el
    // envoltorio de la v0.2 no necesita replicar — un plural mal traducido no
    // aporta nada que no aporte ya una etiqueta mal traducida.
    const tv = useV02T();

    return (
        <aside className="w-72 shrink-0 border-r border-line bg-secondary flex flex-col">
            <div className="border-b border-line p-4 flex flex-col gap-3">
                <span className="comment">{tv('sidebar.selectFile')}</span>
                <button type="button" onClick={onNewNote} className="btn-terminal w-full">
                    {tv('sidebar.newNote')}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {notes.length === 0 ? (
                    <p className="text-center text-meta text-xs mono py-8">
                        {t('sidebar.empty')}
                    </p>
                ) : (
                    <ul className="flex flex-col">
                        {notes.map((note, i) => {
                            const isActive = selectedNote?._id === note._id;

                            return (
                                <li key={note._id}>
                                    <button
                                        type="button"
                                        onClick={() => onSelectNote(note)}
                                        /*
                                            EL PAPEL ENTRANDO. Ver `row-feed`:
                                            la fila baja a su sitio en tres
                                            escalones, y cada una un pelo
                                            después de la anterior — una tirada
                                            de papel, no un fundido.

                                            ⚠ VA ACÁ Y NO EN LA LISTA GRANDE
                                            porque este lateral se ve MIENTRAS
                                            escribís: es la única lista que
                                            está delante cuando algo cambia.
                                        */
                                        className="file-row row-feed"
                                        style={{ '--fila': i } as CSSProperties}
                                        aria-current={isActive}
                                    >
                                        {/* Nombre · guía de puntos · estado.
                                            La guía crece para llenar el hueco,
                                            como en el listado de la referencia. */}
                                        <span className="file-row-name">
                                            {note.title || t('common.untitled')}
                                        </span>
                                        <span className="file-row-leader" aria-hidden="true" />
                                        <span className="file-row-status">
                                            {formatFileSize(note.content.length)}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}

                        {/*
                            LAS QUE SE ESTÁN YENDO, detrás de las de verdad.

                            ⚠ `aria-hidden` Y SIN BOTÓN: para quien usa lector de
                            pantalla esta nota ya no existe, y volver a
                            anunciarla —o dejar algo que pueda enfocarse— sería
                            decirle que sigue ahí. Lo que se está viendo es el
                            hueco cerrándose, y eso no se lee: se mira.
                        */}
                        {saliendo.map((note) => (
                            <li key={`saliendo-${note._id}`} aria-hidden="true">
                                <div className="file-row row-pull">
                                    <span className="file-row-name">
                                        {note.title || t('common.untitled')}
                                    </span>
                                    <span className="file-row-leader" />
                                    <span className="file-row-status">
                                        {formatFileSize(note.content.length)}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {hasMore && (
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="btn-terminal w-full mt-2"
                    >
                        {isLoadingMore
                            ? t('common.loading')
                            : t('sidebar.loadMore', { n: total - notes.length })}
                    </button>
                )}
            </div>

            <div className="panel-footer justify-between text-2xs mono text-meta uppercase tracking-wider">
                <span>
                    {notes.length}
                    {total > notes.length ? `/${total}` : ''}{' '}
                    {/* El plural concuerda con lo que hay CARGADO, que es el
                        número que está pegado a la palabra: "1/6 archivos" sería
                        raro, pero "1 archivo" y "6 archivos" son lo correcto. */}
                    {t.plural('sidebar.files', total > notes.length ? total : notes.length)}
                </span>
                {/* LA HORA DEL EQUIPO, latiendo, en 24 h y con segundos.
                    Antes enseñaba la de la nota abierta, o `--:--:--` cuando no
                    había ninguna — y ese marcador de posición es el que dio pie
                    a todo esto, porque ya parecía morse.

                    Es además el único sitio donde se VE `//date_off`: el reloj
                    es donde mirarías la hora, así que es donde tiene que
                    notarse que el sistema la perdió. */}
                <SystemClock />
            </div>
        </aside>
    );
}
