// UBICACIÓN: src/components/notes/TrashView.tsx
// ACCIÓN: REEMPLAZAR COMPLETO (si existe) o CREAR

'use client';

import { useEffect, useState } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import type { Note } from '@/types/note.types';
import MetaTag from '@/components/ui/MetaTag';
import { formatFileSize, formatRelativeTime } from '@/lib/utils/formatters';

export default function TrashView() {
    const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTrash();
    }, []);

    const loadTrash = async () => {
        try {
            setIsLoading(true);
            const notes = await notesApi.getTrash();
            setTrashedNotes(notes);
        } catch (error) {
            console.error('Error loading trash:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await notesApi.restoreFromTrash(id);
            await loadTrash();
        } catch (error) {
            console.error('Error restoring:', error);
        }
    };

    const handleDeletePermanently = async (id: string) => {
        if (!confirm('¿Eliminar permanentemente? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await notesApi.deletePermanently(id);
            await loadTrash();
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="mono loading-dots">[CARGANDO</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="section-header">
                PAPELERA
            </div>

            {trashedNotes.length === 0 ? (
                <div className="text-center text-meta mono py-8">
                    La papelera está vacía
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trashedNotes.map((note) => (
                        <div key={note._id} className="file-container p-4">
                            {/* Título */}
                            <div className="mono text-base font-medium mb-2 truncate">
                                {note.title || 'Untitled.txt'}
                            </div>

                            {/* Preview */}
                            <div className="mono text-xs text-meta leading-relaxed mb-3 h-16 overflow-hidden">
                                {note.content?.slice(0, 120) || '(vacío)'}
                                {note.content && note.content.length > 120 && '...'}
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                                <MetaTag size="xs" variant="neutral">
                                    {formatRelativeTime(note.updatedAt)}
                                </MetaTag>
                                <MetaTag size="xs" variant="neutral">
                                    {formatFileSize(note.content?.length || 0)}
                                </MetaTag>
                                <MetaTag size="xs" variant="error">
                                    [DELETED]
                                </MetaTag>
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-2 pt-3 border-t border-t-dotted">
                                <button
                                    onClick={() => handleRestore(note._id)}
                                    className="btn-terminal flex-1 text-xs"
                                >
                                    [↶] RESTAURAR
                                </button>
                                <button
                                    onClick={() => handleDeletePermanently(note._id)}
                                    className="btn-terminal flex-1 text-xs"
                                >
                                    [X] ELIMINAR
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
