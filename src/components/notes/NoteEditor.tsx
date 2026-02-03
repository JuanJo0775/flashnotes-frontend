// src/components/notes/NoteEditor.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import type { Note, UpdateNoteDto } from '@/types/note.types';
import Cursor from '@/components/ui/Cursor';
import MetaTag from '@/components/ui/MetaTag';
import QuickActions from './QuickActions';
import { formatFileSize, formatTime } from '@/lib/utils/formatters';

interface NoteEditorProps {
    note: Note;
    onUpdate: (id: string, data: UpdateNoteDto) => Promise<Note>;
    onBack: () => void;
}

export default function NoteEditor({ note, onUpdate, onBack }: NoteEditorProps) {
    const [title, setTitle] = useState(note.title || 'Untitled.txt');
    const [content, setContent] = useState(note.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showCursor, setShowCursor] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
                await onUpdate(note._id, { title, content });
                setLastSaved(new Date());
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
                            <MetaTag variant="neutral">GUARDANDO...</MetaTag>
                        ) : lastSaved ? (
                            <MetaTag variant="success">
                                GUARDADO {formatTime(lastSaved)}
                            </MetaTag>
                        ) : null}

                        <MetaTag variant="neutral">
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
            <QuickActions
                noteId={note._id}
                canUndo={false} // Implementar lógica de undo
                canRedo={false} // Implementar lógica de redo
            />
        </div>
    );
}
