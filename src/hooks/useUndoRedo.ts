// src/hooks/useUndoRedo.ts
'use client';

import { useCallback, useRef, useState } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { getErrorInfo } from '@/lib/api/client';
import type { Message } from '@/i18n';
import type { Note } from '@/types/note.types';
import { isValidObjectId } from '@/lib/utils/validators';

interface UseUndoRedoReturn {
    isProcessing: boolean;
    error: Message | null;
    undo: (noteId: string) => Promise<Note | null>;
    redo: (noteId: string) => Promise<Note | null>;
    clearError: () => void;
}

/**
 * Deshacer y rehacer contra el historial del servidor.
 *
 * El guard contra peticiones concurrentes usa una ref y no el estado: con
 * `isProcessing` en las dependencias del useCallback, dos clics en el mismo
 * ciclo de render leían el valor viejo (false) y ambos salían a la red.
 */
export const useUndoRedo = (): UseUndoRedoReturn => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<Message | null>(null);
    const inFlightRef = useRef(false);

    const run = useCallback(
        async (
            noteId: string,
            operation: (id: string) => Promise<Note>
        ): Promise<Note | null> => {
            if (inFlightRef.current) return null;
            if (!isValidObjectId(noteId)) {
                setError({ key: 'error.INVALID_ID_FORMAT' });
                return null;
            }

            inFlightRef.current = true;
            setIsProcessing(true);
            setError(null);

            try {
                return await operation(noteId);
            } catch (err) {
                setError(getErrorInfo(err));
                return null;
            } finally {
                inFlightRef.current = false;
                setIsProcessing(false);
            }
        },
        []
    );

    const undo = useCallback(
        (noteId: string) => run(noteId, (id) => notesApi.undo(id)),
        [run]
    );

    const redo = useCallback(
        (noteId: string) => run(noteId, (id) => notesApi.redo(id)),
        [run]
    );

    const clearError = useCallback(() => setError(null), []);

    return { isProcessing, error, undo, redo, clearError };
};
