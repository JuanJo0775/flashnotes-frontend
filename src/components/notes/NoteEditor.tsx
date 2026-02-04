// UBICACIÓN: src/components/notes/NoteEditor.tsx
// ACCIÓN: REEMPLAZAR COMPLETO

'use client';

import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import type { Note } from '../../types/note.types';
import Cursor from '@/components/ui/Cursor';
import MetaTag from '@/components/ui/MetaTag';
import { formatFileSize, formatRelativeTime } from '@/lib/utils/formatters';
import { isValidObjectId } from '@/lib/utils/validators';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface NoteEditorProps {
    note: Note;
    onSave: (id: string, data: { title?: string; content?: string }) => Promise<Note | null>;
    onBack: () => void;
    onUndo: (id: string) => Promise<Note | null>;
    onRedo: (id: string) => Promise<Note | null>;
    onMoveToTrash: (id: string) => Promise<boolean>;
}

export default function NoteEditor(props: NoteEditorProps) {
    const { note, onSave, onBack, onUndo, onRedo, onMoveToTrash } = props;
    const { isFullyOperational } = useNetworkStatus();
    
    // Inicializar con valores de la nota; título por defecto 'Nueva nota'
    const [title, setTitle] = useState(note.title || 'Nueva nota');
    const [content, setContent] = useState(note.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showCursor, setShowCursor] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [lastServerUpdatedAt, setLastServerUpdatedAt] = useState<string | undefined>(note.updatedAt);
    const [conflictDialog, setConflictDialog] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false); // Lock para evitar race condition
    const [showTrashConfirm, setShowTrashConfirm] = useState(false); // Modal de confirmación trash

    const contentRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressConflictRef = useRef(false);
    const autoSaveResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sincronizar estado local cuando cambie la nota (p. ej. al crear y abrir)
    // TAMBIÉN detectar si hubo cambios externos (conflict detection)
    useEffect(() => {
        if (suppressConflictRef.current) {
            suppressConflictRef.current = false;
            setTitle(note.title || 'Nueva nota');
            setContent(note.content || '');
            setCanUndo((note as any).versions?.length > 0);
            setCanRedo((note as any).redoStack?.length > 0);
            setLastServerUpdatedAt(note.updatedAt);
            setConflictDialog(false);
            return;
        }

        // Detectar si la nota cambió por fuera (otra pestaña, etc)
        const hasExternalChanges = lastServerUpdatedAt &&
                                   note.updatedAt &&
                                   lastServerUpdatedAt !== note.updatedAt;

        if (hasExternalChanges) {
            // Mostrar dialog de conflicto
            setConflictDialog(true);
        } else {
            // Sincronizar valores de la prop
            setTitle(note.title || 'Nueva nota');
            setContent(note.content || '');
            setCanUndo((note as any).versions?.length > 0);
            setCanRedo((note as any).redoStack?.length > 0);
            setLastServerUpdatedAt(note.updatedAt);
        }
    }, [note, lastServerUpdatedAt]);

    // Auto-save con debounce
    useEffect(() => {
        // No guardar si está sincronizando (undo/redo en curso)
        if (isSyncing) {
            console.debug('[NoteEditor] Skipping autosave: sync in progress (undo/redo)');
            return;
        }

        // SECURITY: No guardar si no hay conexión de red o backend no disponible
        if (!isFullyOperational) {
            console.debug('[NoteEditor] Skipping autosave: network or backend unavailable');
            return;
        }

        // No guardar si la nota no está persistida
        if (!isValidObjectId(note._id)) {
            console.debug('[NoteEditor] Skipping autosave: invalid or missing note ID', {
                noteId: note._id
            });
            return;
        }

        // Comparar con la nota actual (prop) para evitar guardar si no hay cambios reales
        if (title === (note.title || 'Nueva nota') && content === (note.content || '')) {
            console.debug('[NoteEditor] Skipping autosave: no changes detected', {
                noteId: note._id
            });
            return;
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                // Protección adicional: no llamar onSave si no hay id válido
                if (!isValidObjectId(note._id)) {
                    console.warn('[NoteEditor] Cannot save: invalid note ID at save time', {
                        noteId: note._id
                    });
                    return;
                }

                // SECURITY: Sanitizar contenido antes de enviar (defensa en profundidad)
                const sanitizedTitle = DOMPurify.sanitize(title, {
                    ALLOWED_TAGS: [],
                    ALLOWED_ATTR: []
                });
                const sanitizedContent = DOMPurify.sanitize(content, {
                    ALLOWED_TAGS: [],
                    ALLOWED_ATTR: []
                });

                console.debug('[NoteEditor] Initiating autosave', {
                    noteId: note._id,
                    titleLength: sanitizedTitle.length,
                    contentLength: sanitizedContent.length
                });

                const updated = await onSave(note._id, { 
                    title: sanitizedTitle, 
                    content: sanitizedContent 
                });
                if (updated) {
                    // Usar exclusivamente la nota retornada por el backend para mantener sincronía
                    setTitle(updated.title || 'Nueva nota');
                    setContent(updated.content || '');
                    setLastSaved(new Date());
                    setLastServerUpdatedAt(updated.updatedAt); // Actualizar timestamp del servidor
                    setCanUndo((updated as any).versions?.length > 0);
                    setCanRedo((updated as any).redoStack?.length > 0);
                    console.debug('[NoteEditor] Autosave successful', {
                        noteId: updated._id
                    });
                }
            } catch (error) {
                console.error('[NoteEditor] Error saving:', error, {
                    noteId: note._id
                });
            } finally {
                setIsSaving(false);
            }
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [title, content, note, onSave, isSyncing, isFullyOperational]);

    // Focus en el editor al montar
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.focus();
        }
    }, []);

    /**
     * Pausa el auto-save estableciendo isSyncing en true
     * Se usa antes de undo/redo para evitar race condition
     */
    const pauseAutoSave = () => {
        setIsSyncing(true);
    };

    /**
     * Reanuda el auto-save después de 500ms
     * Garantiza que undo/redo + respuesta del servidor finalicen antes de permitir auto-save
     */
    const resumeAutoSave = () => {
        if (autoSaveResumeTimeoutRef.current) {
            clearTimeout(autoSaveResumeTimeoutRef.current);
        }
        autoSaveResumeTimeoutRef.current = setTimeout(() => {
            setIsSyncing(false);
        }, 500);
    };

    const handleUndo = async () => {
        if (!canUndo) return;
        if (!isValidObjectId(note._id)) return; // no operar si no está persistida
        
        pauseAutoSave(); // ⏸️ Pausar auto-save para evitar race condition
        try {
            suppressConflictRef.current = true;
            const updated = await onUndo(note._id);
            if (updated) {
                setTitle(updated.title);
                setContent(updated.content);
                setCanUndo((updated as any).versions?.length > 0);
                setCanRedo((updated as any).redoStack?.length > 0);
                setLastServerUpdatedAt(updated.updatedAt);
                setConflictDialog(false);
            }
        } catch (error) {
            console.error('Error undoing:', error);
        } finally {
            resumeAutoSave(); // ▶️ Reanudar después de 500ms
        }
    };

    const handleRedo = async () => {
        if (!canRedo) return;
        if (!isValidObjectId(note._id)) return; // no operar si no está persistida
        
        pauseAutoSave(); // ⏸️ Pausar auto-save para evitar race condition
        try {
            suppressConflictRef.current = true;
            const updated = await onRedo(note._id);
            if (updated) {
                setTitle(updated.title);
                setContent(updated.content);
                setCanUndo((updated as any).versions?.length > 0);
                setCanRedo((updated as any).redoStack?.length > 0);
                setLastServerUpdatedAt(updated.updatedAt);
                setConflictDialog(false);
            }
        } catch (error) {
            console.error('Error redoing:', error);
        } finally {
            resumeAutoSave(); // ▶️ Reanudar después de 500ms
        }
    };

    const handleTrash = async () => {
        if (!isValidObjectId(note._id)) return; // no operar si no está persistida
        setShowTrashConfirm(true); // Abrir modal de confirmación
    };

    const handleTrashConfirm = async () => {
        try {
            const success = await onMoveToTrash(note._id);
            if (success) {
                setShowTrashConfirm(false);
                onBack();
            }
        } catch (error) {
            console.error('Error moving to trash:', error);
            setShowTrashConfirm(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Modal de confirmación para mover a papelera */}
            {showTrashConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-secondary border-2 border-primary p-6 max-w-md">
                        <h2 className="text-lg font-pixel mb-4 text-yellow-400">
                            ⚠ MOVER A PAPELERA
                        </h2>
                        <p className="mono text-sm mb-6 text-gray-200">
                            ¿Mover esta nota a la papelera? Esta acción puede revertirse desde la papelera.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleTrashConfirm}
                                className="btn-terminal flex-1 text-xs"
                            >
                                [✓] ACEPTAR
                            </button>
                            <button
                                onClick={() => setShowTrashConfirm(false)}
                                className="btn-terminal flex-1 text-xs"
                            >
                                [✗] CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog de conflicto si la nota cambió externamente */}
            {conflictDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-secondary border-2 border-primary p-6 max-w-md">
                        <h2 className="text-lg font-pixel mb-4 text-yellow-400">
                            ⚠ CONFLICTO DETECTADO
                        </h2>
                        <p className="mono text-sm mb-4 text-gray-200">
                            Esta nota fue modificada desde otro lugar. 
                            ¿Descartas tus cambios locales y usas la versión del servidor?
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    // Descartar cambios locales y usar servidor
                                    setTitle(note.title || 'Nueva nota');
                                    setContent(note.content || '');
                                    setLastServerUpdatedAt(note.updatedAt);
                                    setConflictDialog(false);
                                }}
                                className="btn-terminal flex-1 text-xs"
                            >
                                [✓] USAR SERVIDOR
                            </button>
                            <button
                                onClick={() => {
                                    // Mantener cambios locales y ignorar conflicto
                                    setLastServerUpdatedAt(note.updatedAt);
                                    setConflictDialog(false);
                                }}
                                className="btn-terminal flex-1 text-xs"
                            >
                                [!] MANTENER MÍOS
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
