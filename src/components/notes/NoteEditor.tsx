// UBICACIÓN: src/components/notes/NoteEditor.tsx
// ACCIÓN: REEMPLAZAR COMPLETO

'use client';

import { useState, useRef, useEffect } from 'react';
import type { Note } from '@/types/note.types';
import Cursor from '@/components/ui/Cursor';
import MetaTag from '@/components/ui/MetaTag';
import { formatFileSize, formatRelativeTime } from '@/lib/utils/formatters';
import { notesApi } from '@/lib/api/notes.api';

interface NoteEditorProps {
    note: Note;
    onUpdate: (id: string, data: { title?: string; content?: string }) => Promise<Note | null>;
    onBack: () => void;
}

export default function NoteEditor({ note, onUpdate, onBack }: NoteEditorProps) {
    const [title, setTitle] = useState(note.title || 'Untitled.txt');
    const [content, setContent] = useState(note.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showCursor, setShowCursor] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const contentRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

    // Auto-save con debounce
    useEffect(() => {
        if (title === note.title && content === note.content) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                const updated = await onUpdate(note._id, { title, content });
                if (updated) {
                    setLastSaved(new Date());
                    // Actualizar estados de undo/redo si el backend los retorna
                    setCanUndo((updated as any).versions?.length > 0);
                    setCanRedo((updated as any).redoStack?.length > 0);
                }
            } catch (error) {
                console.error('Error saving:', error);
            } finally {
                setIsSaving(false);
            }
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [title, content, note._id, note.title, note.content, onUpdate]);

    // Focus en el editor al montar
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.focus();
        }
    }, []);

    // Verificar estado de undo/redo al cargar
    useEffect(() => {
        setCanUndo((note as any).versions?.length > 0);
        setCanRedo((note as any).redoStack?.length > 0);
    }, [note]);

    const handleUndo = async () => {
        if (!canUndo) return;
        try {
            const updated = await notesApi.undo(note._id);
            setTitle(updated.title);
            setContent(updated.content);
            setCanUndo((updated as any).versions?.length > 0);
            setCanRedo((updated as any).redoStack?.length > 0);
        } catch (error) {
            console.error('Error undoing:', error);
        }
    };

    const handleRedo = async () => {
        if (!canRedo) return;
        try {
            const updated = await notesApi.redo(note._id);
            setTitle(updated.title);
            setContent(updated.content);
            setCanUndo((updated as any).versions?.length > 0);
            setCanRedo((updated as any).redoStack?.length > 0);
        } catch (error) {
            console.error('Error redoing:', error);
        }
    };

    const handleTrash = async () => {
        if (confirm('¿Mover esta nota a la papelera?')) {
            try {
                await notesApi.moveToTrash(note._id);
                onBack();
            } catch (error) {
                console.error('Error moving to trash:', error);
            }
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar superior */}
            <div className="border-b border-b-primary bg-secondary p-4">
                <div className="flex items-center justify-between mb-3">
                    <button
                        onClick={onBack}
                        className="btn-terminal text-xs"
                    >
                        [←] VOLVER
                    </button>

                    <div className="flex items-center gap-2">
                        {isSaving ? (
                            <MetaTag variant="neutral" size="xs">GUARDANDO...</MetaTag>
                        ) : lastSaved ? (
                            <MetaTag variant="success" size="xs">
                                GUARDADO {formatRelativeTime(lastSaved)}
                            </MetaTag>
                        ) : null}

                        <MetaTag variant="neutral" size="xs">
                            {formatFileSize(content.length)}
                        </MetaTag>
                    </div>
                </div>

                {/* Título editable */}
                <div className="comment mb-2">EDITOR_CORE:</div>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-terminal w-full font-pixel text-lg"
                    placeholder="Nombre_del_archivo.txt"
                />
            </div>

            {/* Área de edición */}
            <div className="flex-1 overflow-hidden relative bg-tertiary">
                <div className="p-6 h-full flex items-start">
                    <span className="mono text-meta mr-2 select-none">&gt;</span>
                    <div className="flex-1 relative">
                        <textarea
                            ref={contentRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onFocus={() => setShowCursor(true)}
                            onBlur={() => setShowCursor(false)}
                            className="w-full h-full resize-none bg-transparent border-none outline-none mono text-base leading-relaxed"
                            placeholder="El usuario comienza a escribir aquí..."
                            style={{ minHeight: 'calc(100vh - 250px)' }}
                        />
                        {showCursor && <Cursor />}
                    </div>
                </div>
            </div>

            {/* Acciones rápidas */}
            <div className="border-t border-t-primary bg-secondary p-4">
                <div className="flex items-center justify-between">
                    <div className="comment">ACCIONES_RÁPIDAS:</div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleUndo}
                            disabled={!canUndo}
                            className="btn-terminal text-xs"
                            title="Deshacer (Ctrl+Z)"
                        >
                            [↶] UNDO
                        </button>

                        <button
                            onClick={handleRedo}
                            disabled={!canRedo}
                            className="btn-terminal text-xs"
                            title="Rehacer (Ctrl+Y)"
                        >
                            [↷] REDO
                        </button>

                        <div className="border-l border-l-primary h-6 mx-2" />

                        <button
                            onClick={handleTrash}
                            className="btn-terminal text-xs"
                            title="Mover a papelera"
                        >
                            [🗑] TRASH
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
