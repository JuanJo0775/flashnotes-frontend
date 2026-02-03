// src/components/layout/Sidebar.tsx

'use client';

import type { Note } from '../../types/note.types';
import MetaTag from '@/components/ui/MetaTag';
import { formatFileSize, formatTime } from '@/lib/utils/formatters';

interface SidebarProps {
    notes: Note[];
    onSelectNote: (note: Note) => void;
    selectedNote: Note | null;
    onNewNote: () => void;
    onOpenTrash?: () => void; // nuevo prop opcional para abrir papelera
}

export default function Sidebar({ notes, onSelectNote, selectedNote, onNewNote, onOpenTrash }: SidebarProps) {
    return (
        <aside className="w-80 border-r border-r-primary bg-tertiary flex flex-col">
            {/* Header del sidebar */}
            <div className="border-b border-b-primary p-4">
                <div className="comment mb-3">SELECCIONAR_ARCHIVO:</div>
                <div className="flex gap-2">
                    <button
                        onClick={onNewNote}
                        className="btn-terminal w-full"
                    >
                        [+] NUEVA NOTA
                    </button>
                    <button
                        onClick={() => onOpenTrash && onOpenTrash()}
                        className="btn-terminal"
                        title="Abrir papelera"
                    >
                        [-] DELE
                    </button>
                </div>
            </div>

            {/* Lista de archivos */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="file-list">
                    {notes.length === 0 ? (
                        <div className="text-center text-meta text-sm mono py-8">
                            No hay archivos
                        </div>
                    ) : (
                        notes.map((note) => (
                            <button
                                key={note._id}
                                onClick={() => onSelectNote(note)}
                                className={`file-item text-left w-full ${
                                    selectedNote?._id === note._id ? 'inverted' : ''
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="mono text-sm truncate">
                                        {note.title || 'Untitled.txt'}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <MetaTag size="xs" variant="neutral">
                                            {note.updatedAt ? formatTime(note.updatedAt) : '-'}
                                        </MetaTag>
                                        <MetaTag size="xs" variant="neutral">
                                            {formatFileSize(note.content.length)}
                                        </MetaTag>
                                    </div>
                                </div>

                                <MetaTag size="xs" variant="success">
                                    [OPEN]
                                </MetaTag>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Footer con stats */}
            <div className="border-t border-t-primary p-4">
                <div className="flex items-center justify-between text-xs mono text-meta">
                    <span>TOTAL: {notes.length}</span>
                    <span>ACTIVOS</span>
                </div>
            </div>
        </aside>
    );
}
