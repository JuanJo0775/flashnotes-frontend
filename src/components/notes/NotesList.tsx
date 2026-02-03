// src/components/notes/NotesList.tsx

'use client';

import type { Note } from '@/types/note.types';
import NoteCard from './NoteCard';
import TypewriterText from '@/components/effects/TypewriterText';

interface NotesListProps {
    notes: Note[];
    isLoading: boolean;
    onSelectNote: (note: Note) => void;
    onNewNote: () => void;
}

export default function NotesList({ notes, isLoading, onSelectNote, onNewNote }: NotesListProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="mono text-lg loading-dots">[CARGANDO</div>
                    <div className="mt-4 text-meta text-sm mono">
                        Recuperando archivos del sistema...
                    </div>
                </div>
            </div>
        );
    }

    if (notes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                    <div className="pixel text-2xl mb-4">
                        <TypewriterText text="[SISTEMA_VACÍO]" speed={50} />
                    </div>
                    <p className="mono text-sm text-meta mb-6">
                        No hay archivos en el sistema.
                        <br />
                        Crea un nuevo archivo para comenzar.
                    </p>
                    <button
                        onClick={onNewNote}
                        className="btn-terminal"
                    >
                        [+] CREAR_PRIMER_ARCHIVO
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="section-header">
                ARCHIVOS_DISPONIBLES
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map((note) => (
                    <NoteCard
                        key={note._id}
                        note={note}
                        onClick={() => onSelectNote(note)}
                    />
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-t-dashed">
                <button
                    onClick={onNewNote}
                    className="btn-terminal"
                >
                    [+] NUEVO_ARCHIVO
                </button>
            </div>
        </div>
    );
}
