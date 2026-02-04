// UBICACIÓN: src/components/notes/TrashView.tsx
// ACCIÓN: REEMPLAZAR COMPLETO (si existe) o CREAR

'use client';

import { useState } from 'react';
import { useTrash } from '@/hooks/useTrash';
import MetaTag from '@/components/ui/MetaTag';
import { formatFileSize, formatRelativeTime } from '@/lib/utils/formatters';

export default function TrashView() {
    const {
        trashedNotes,
        isLoading,
        error,
        restoreNote,
        deletePermanently,
        clearError,
    } = useTrash();

    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isRestoring, setIsRestoring] = useState<string | null>(null);

    const handleRestore = async (id: string) => {
        setIsRestoring(id);
        const success = await restoreNote(id);
        if (success) {
            setIsRestoring(null);
        }
    };

    const handleDeletePermanently = async (id: string) => {
        if (!confirm('¿Eliminar permanentemente? Esta acción no se puede deshacer.')) {
            return;
        }

        setIsDeleting(id);
        const success = await deletePermanently(id);
        if (success) {
            setIsDeleting(null);
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

            {/* Error message si hay */}
            {error && (
                <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4 flex justify-between items-center">
                    <span className="mono text-sm">{error}</span>
                    <button
                        onClick={clearError}
                        className="text-red-300 hover:text-red-200"
                    >
                        [X]
                    </button>
                </div>
            )}

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
                                    {note.updatedAt ? formatRelativeTime(note.updatedAt) : '-'}
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
                                    disabled={isRestoring === note._id}
                                    aria-label={isRestoring === note._id ? `Restaurando ${note.title || 'nota'}` : `Restaurar ${note.title || 'nota'}`}
                                    aria-busy={isRestoring === note._id}
                                    className="btn-terminal flex-1 text-xs disabled:opacity-50"
                                >
                                    {isRestoring === note._id ? '[...] ' : '[↶] '}
                                    RESTAURAR
                                </button>
                                <button
                                    onClick={() => handleDeletePermanently(note._id)}
                                    disabled={isDeleting === note._id}
                                    aria-label={isDeleting === note._id ? `Eliminando permanentemente ${note.title || 'nota'}` : `Eliminar permanentemente ${note.title || 'nota'}`}
                                    aria-busy={isDeleting === note._id}
                                    className="btn-terminal flex-1 text-xs disabled:opacity-50"
                                >
                                    {isDeleting === note._id ? '[...] ' : '[X] '}
                                    ELIMINAR
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
