// src/components/notes/NoteEditor.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Note, SaveState } from '@/types/note.types';
import MetaTag from '@/components/ui/MetaTag';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatFileSize } from '@/lib/utils/formatters';
import { isValidObjectId } from '@/lib/utils/validators';
import { LIMITS } from '@/config/limits';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

/**
 * Cadencia del auto-guardado.
 *
 * Eran 1000 ms, y como el backend crea un punto de historial por cada PATCH con
 * cambios, veinte segundos de escritura llenaban las 20 ranuras de historial con
 * estados separados por un segundo: "deshacer" retrocedía un segundo en vez de
 * un cambio, y la versión de hace cinco minutos ya se había perdido.
 *
 * 2,5 s agrupa una ráfaga de tecleo en un solo punto de historial. Además se
 * fuerza el guardado al salir del campo y al cerrar el editor, así que subir el
 * intervalo no significa perder trabajo.
 */
const AUTOSAVE_DELAY_MS = 2500;

interface NoteEditorProps {
    note: Note;
    onSave: (id: string, data: { title?: string; content?: string }) => Promise<Note | null>;
    onBack: () => void;
    onUndo: (id: string) => Promise<Note | null>;
    onRedo: (id: string) => Promise<Note | null>;
    onMoveToTrash: (id: string) => Promise<boolean>;
    onSaveStateChange: (state: SaveState) => void;
}

export default function NoteEditor({
    note,
    onSave,
    onBack,
    onUndo,
    onRedo,
    onMoveToTrash,
    onSaveStateChange,
}: NoteEditorProps) {
    const { isFullyOperational } = useNetworkStatus();

    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState(note.content);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [canUndo, setCanUndo] = useState(Boolean(note.versions?.length));
    const [canRedo, setCanRedo] = useState(Boolean(note.redoStack?.length));
    const [showTrashConfirm, setShowTrashConfirm] = useState(false);
    const [isTrashing, setIsTrashing] = useState(false);

    const contentRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Qué se envió al servidor por última vez. Es lo que decide si hay cambios
    // pendientes, sin necesidad de comparar contra la prop `note` (que cambia
    // de identidad en cada render del padre).
    const savedRef = useRef({ title: note.title, content: note.content });

    // Borrador actual, accesible desde callbacks sin recrearlos en cada tecla.
    // Se sincroniza en un efecto: escribir en una ref durante el render rompe
    // el render concurrente de React.
    const draftRef = useRef({ title: note.title, content: note.content });
    useEffect(() => {
        draftRef.current = { title, content };
    }, [title, content]);

    // El editor está montado para esta nota concreta: si cambia la nota
    // seleccionada, el padre lo remonta con `key`, así que no hace falta ningún
    // efecto de sincronización. El efecto anterior (que dependía de `note` y de
    // su propio estado) era el que disparaba los falsos "conflicto detectado".
    const noteId = note._id;

    const applyServerNote = useCallback((updated: Note) => {
        savedRef.current = { title: updated.title, content: updated.content };
        setCanUndo(Boolean(updated.versions?.length));
        setCanRedo(Boolean(updated.redoStack?.length));
    }, []);

    const reportState = useCallback(
        (state: SaveState) => {
            setSaveState(state);
            onSaveStateChange(state);
        },
        [onSaveStateChange]
    );

    /**
     * Envía los cambios pendientes.
     *
     * A diferencia de la versión anterior, NO reescribe el textarea con la
     * respuesta del servidor. Antes hacía setContent(updated.content), así que
     * si seguías tecleando durante el viaje de ida y vuelta tus pulsaciones se
     * descartaban y el cursor saltaba. Mientras el editor está abierto, el
     * textarea es la fuente de verdad; del servidor sólo se toman los flags de
     * historial.
     */
    const flush = useCallback(async () => {
        if (!isValidObjectId(noteId)) return;

        const draft = draftRef.current;
        const saved = savedRef.current;

        const payload: { title?: string; content?: string } = {};
        if (draft.title !== saved.title) payload.title = draft.title;
        if (draft.content !== saved.content) payload.content = draft.content;

        if (Object.keys(payload).length === 0) return;

        // Sin red no se intenta: se avisa y se reintenta al volver la conexión.
        if (!isFullyOperational) {
            reportState('error');
            return;
        }

        reportState('saving');

        const updated = await onSave(noteId, payload);

        if (updated) {
            applyServerNote(updated);
            reportState('saved');
        } else {
            // useNotes ya publicó el mensaje concreto en el estado de error.
            reportState('error');
        }
    }, [noteId, isFullyOperational, onSave, applyServerNote, reportState]);

    // Auto-guardado con debounce sobre el borrador.
    useEffect(() => {
        const saved = savedRef.current;
        if (title === saved.title && content === saved.content) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [title, content, flush]);

    // Guardar lo pendiente al desmontar (volver a la lista, cambiar de nota).
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            void flush();
        };
    }, [flush]);

    // Reintentar cuando la conexión VUELVE, no mientras haya un error.
    //
    // Depender de `saveState` acá creaba un bucle: el reintento ponía el estado
    // en 'saving', luego en 'error', el efecto volvía a dispararse por el cambio
    // de estado y reintentaba otra vez, sin parar. Sólo interesa el flanco de
    // subida de la conectividad, así que se compara contra el valor anterior.
    const wasOperationalRef = useRef(isFullyOperational);
    useEffect(() => {
        const recovered = isFullyOperational && !wasOperationalRef.current;
        wasOperationalRef.current = isFullyOperational;

        // flush() sincroniza con un sistema externo (la API) y sólo publica el
        // estado resultante: es el caso que la regla contempla como válido, pero
        // no puede verlo a través de la llamada.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (recovered) void flush();
    }, [isFullyOperational, flush]);

    useEffect(() => {
        contentRef.current?.focus();
    }, []);

    const runHistoryAction = useCallback(
        async (action: (id: string) => Promise<Note | null>) => {
            if (!isValidObjectId(noteId)) return;

            // Se vacía lo pendiente ANTES de tocar el historial: si no, el
            // auto-guardado en vuelo pisaba el resultado del undo/redo.
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            await flush();

            const updated = await action(noteId);
            if (!updated) return;

            setTitle(updated.title);
            setContent(updated.content);
            applyServerNote(updated);
            reportState('saved');
        },
        [noteId, flush, applyServerNote, reportState]
    );

    const handleUndo = useCallback(() => {
        if (canUndo) void runHistoryAction(onUndo);
    }, [canUndo, runHistoryAction, onUndo]);

    const handleRedo = useCallback(() => {
        if (canRedo) void runHistoryAction(onRedo);
    }, [canRedo, runHistoryAction, onRedo]);

    const handleTrashConfirm = useCallback(async () => {
        setIsTrashing(true);

        // Se cancela lo pendiente: la nota se va a la papelera, guardarla antes
        // sólo crearía un punto de historial inútil.
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        savedRef.current = draftRef.current;

        const moved = await onMoveToTrash(noteId);
        setIsTrashing(false);
        setShowTrashConfirm(false);

        if (moved) onBack();
    }, [noteId, onMoveToTrash, onBack]);

    useKeyboardShortcuts({
        onSave: () => void flush(),
        onUndo: handleUndo,
        onRedo: handleRedo,
    });

    const overContentLimit = content.length > LIMITS.CONTENT_MAX;

    return (
        <div className="flex flex-col h-full">
            <ConfirmDialog
                open={showTrashConfirm}
                title="⚠ Mover a papelera"
                message="La nota se moverá a la papelera. Podés restaurarla desde ahí."
                confirmLabel="[✓] Mover"
                busy={isTrashing}
                onConfirm={handleTrashConfirm}
                onCancel={() => setShowTrashConfirm(false)}
            />

            {/* --- Barra superior --- */}
            <div className="border-b border-line bg-secondary p-4 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <button type="button" onClick={onBack} className="btn-terminal">
                        [←] Volver
                    </button>

                    <div className="flex items-center gap-2">
                        {saveState === 'saving' && (
                            <MetaTag variant="neutral">Guardando…</MetaTag>
                        )}
                        {saveState === 'saved' && (
                            <MetaTag variant="success">Guardado</MetaTag>
                        )}
                        {saveState === 'error' && (
                            <MetaTag variant="error">Sin guardar</MetaTag>
                        )}
                        <MetaTag variant={overContentLimit ? 'error' : 'neutral'}>
                            {formatFileSize(content.length)}
                        </MetaTag>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="note-title-input" className="comment">
                        Editor_core
                    </label>
                    <input
                        id="note-title-input"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => void flush()}
                        maxLength={LIMITS.TITLE_MAX}
                        className="input-terminal pixel text-xl"
                        placeholder="Nombre_del_archivo.txt"
                    />
                </div>
            </div>

            {/* --- Área de escritura --- */}
            <div className="flex-1 min-h-0 bg-tertiary">
                <div className="h-full flex items-start gap-2 p-6">
                    <span className="mono text-meta select-none pt-px" aria-hidden="true">
                        &gt;
                    </span>
                    <label htmlFor="note-content-textarea" className="sr-only">
                        Contenido de la nota
                    </label>
                    <textarea
                        id="note-content-textarea"
                        ref={contentRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onBlur={() => void flush()}
                        className="flex-1 h-full resize-none bg-transparent border-none outline-none mono text-base leading-relaxed"
                        placeholder="El usuario comienza a escribir aquí…"
                        spellCheck={false}
                    />
                </div>
            </div>

            {overContentLimit && (
                <p className="notice shrink-0" role="alert">
                    <span>
                        La nota supera los {LIMITS.CONTENT_MAX.toLocaleString('es')}{' '}
                        caracteres y no se puede guardar. Recortá{' '}
                        {(content.length - LIMITS.CONTENT_MAX).toLocaleString('es')}.
                    </span>
                </p>
            )}

            {/* --- Acciones --- */}
            <div className="panel-footer justify-between">
                <span className="comment">Acciones_rápidas</span>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={!canUndo}
                        className="btn-terminal"
                        title="Deshacer (Ctrl+Z)"
                    >
                        [↶] Undo
                    </button>
                    <button
                        type="button"
                        onClick={handleRedo}
                        disabled={!canRedo}
                        className="btn-terminal"
                        title="Rehacer (Ctrl+Y)"
                    >
                        [↷] Redo
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowTrashConfirm(true)}
                        className="btn-terminal"
                        title="Mover a papelera"
                    >
                        [🗑] Papelera
                    </button>
                </div>
            </div>
        </div>
    );
}
