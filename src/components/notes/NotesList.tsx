// src/components/notes/NotesList.tsx
'use client';

import V02NoteCard from '@/components/notes/V02NoteCard';
import V02Loading from '@/components/notes/V02Loading';
import { useSystemState } from '@/hooks/useSystemState';
import { useV02T } from '@/i18n/useV02T';
import type { Note } from '@/types/note.types';
import NoteCard from './NoteCard';
import TypewriterText from '@/components/effects/TypewriterText';

interface NotesListProps {
    notes: Note[];
    isLoading: boolean;
    hasMore: boolean;
    isLoadingMore: boolean;
    total: number;
    onSelectNote: (note: Note) => void;
    onNewNote: () => void;
    onLoadMore: () => void;
}

export default function NotesList({
    notes,
    isLoading,
    hasMore,
    isLoadingMore,
    total,
    onSelectNote,
    onNewNote,
    onLoadMore,
}: NotesListProps) {
    // En la v0.2 una de cada cuatro etiquetas sale mal. Fuera de ella, esto es
    // `useT()` y nada más.
    const t = useV02T();
    const { v02 } = useSystemState();

    // LA v0.2 CARGA A SU MANERA: una barra dibujada que miente. Dejarle la
    // pantalla de la v1.0 era el mismo descuido que la papelera — un trozo sin
    // envejecer en medio de una versión que sí lo está.
    if (isLoading && v02) return <V02Loading />;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center flex flex-col gap-3">
                    <p className="mono text-lg loading-dots">{t('list.loading')}</p>
                    <p className="text-meta text-xs mono">
                        {t('list.loadingDetail')}
                    </p>
                </div>
            </div>
        );
    }

    if (notes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-6">
                <div className="text-center max-w-sm flex flex-col gap-5 items-center">
                    <p className="pixel text-3xl">
                        <TypewriterText text={t('list.emptyBanner')} speed={45} />
                    </p>
                    <p className="mono text-sm text-meta">
                        {t('list.emptyLine1')}
                        <br />
                        {t('list.emptyLine2')}
                    </p>
                    <button type="button" onClick={onNewNote} className="btn-terminal">
                        {t('list.createFirst')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="section-header flex items-baseline justify-between gap-4">
                <span>{t('list.available')}</span>
                <span className="mono text-xs text-meta tabular-nums">
                    {notes.length}
                    {total > notes.length ? ` / ${total}` : ''}
                </span>
            </h2>

            {/* En la v0.2 las tarjetas no son cajas con borde: son CUADROS
                DIBUJADOS con `+`, `-` y `|`, y los huecos rellenos de puntos.
                Así se hacía una tarjeta antes de que hubiera tarjetas. */}
            {v02 ? (
                <ul className="v02-grid">
                    {notes.map((note) => (
                        <li key={note._id}>
                            <V02NoteCard note={note} onSelect={onSelectNote} />
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {notes.map((note) => (
                        <NoteCard
                            key={note._id}
                            note={note}
                            onClick={() => onSelectNote(note)}
                        />
                    ))}
                </div>
            )}

            <hr className="rule-dashed my-6" />

            <div className="flex items-center gap-2">
                <button type="button" onClick={onNewNote} className="btn-terminal">
                    {t('list.newFile')}
                </button>

                {hasMore && (
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="btn-terminal"
                    >
                        {isLoadingMore
                            ? t('common.loading')
                            : t('list.loadMore', { n: total - notes.length })}
                    </button>
                )}
            </div>
        </div>
    );
}
