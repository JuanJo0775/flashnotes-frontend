// src/components/notes/NotesList.tsx
'use client';

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
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center flex flex-col gap-3">
                    <p className="mono text-lg loading-dots">[CARGANDO</p>
                    <p className="text-meta text-xs mono">
                        Recuperando archivos del sistema
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
                        <TypewriterText text="[SISTEMA_VACÍO]" speed={45} />
                    </p>
                    <p className="mono text-sm text-meta">
                        No hay archivos en el sistema.
                        <br />
                        Creá el primero para empezar.
                    </p>
                    <button type="button" onClick={onNewNote} className="btn-terminal">
                        [+] Crear primer archivo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="section-header flex items-baseline justify-between gap-4">
                <span>Archivos_disponibles</span>
                <span className="mono text-xs text-meta tabular-nums">
                    {notes.length}
                    {total > notes.length ? ` / ${total}` : ''}
                </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {notes.map((note) => (
                    <NoteCard
                        key={note._id}
                        note={note}
                        onClick={() => onSelectNote(note)}
                    />
                ))}
            </div>

            <hr className="rule-dashed my-6" />

            <div className="flex items-center gap-2">
                <button type="button" onClick={onNewNote} className="btn-terminal">
                    [+] Nuevo archivo
                </button>

                {hasMore && (
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="btn-terminal"
                    >
                        {isLoadingMore
                            ? '[...] Cargando'
                            : `[↓] Cargar ${total - notes.length} más`}
                    </button>
                )}
            </div>
        </div>
    );
}
