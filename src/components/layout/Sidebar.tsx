// src/components/layout/Sidebar.tsx
'use client';

import type { Note } from '@/types/note.types';
import { formatFileSize, formatTime } from '@/lib/utils/formatters';

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
    return (
        <aside className="w-72 shrink-0 border-r border-line bg-secondary flex flex-col">
            <div className="border-b border-line p-4 flex flex-col gap-3">
                <span className="comment">Seleccionar_archivo</span>
                <button type="button" onClick={onNewNote} className="btn-terminal w-full">
                    [+] Nueva nota
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {notes.length === 0 ? (
                    <p className="text-center text-meta text-xs mono py-8">
                        Sin archivos
                    </p>
                ) : (
                    <ul className="flex flex-col">
                        {notes.map((note) => {
                            const isActive = selectedNote?._id === note._id;

                            return (
                                <li key={note._id}>
                                    <button
                                        type="button"
                                        onClick={() => onSelectNote(note)}
                                        className="file-row"
                                        aria-current={isActive}
                                    >
                                        {/* Nombre · guía de puntos · estado.
                                            La guía crece para llenar el hueco,
                                            como en el listado de la referencia. */}
                                        <span className="file-row-name">
                                            {note.title || 'Sin_titulo.txt'}
                                        </span>
                                        <span className="file-row-leader" aria-hidden="true" />
                                        <span className="file-row-status">
                                            {formatFileSize(note.content.length)}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
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
                            ? '[...] Cargando'
                            : `[↓] Cargar más (${total - notes.length})`}
                    </button>
                )}
            </div>

            <div className="panel-footer justify-between text-2xs mono text-meta uppercase tracking-wider">
                <span>
                    {notes.length}
                    {total > notes.length ? `/${total}` : ''} archivos
                </span>
                <span>
                    {selectedNote?.updatedAt ? formatTime(selectedNote.updatedAt) : '--:--:--'}
                </span>
            </div>
        </aside>
    );
}
