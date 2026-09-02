// src/hooks/useTrash.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { getErrorInfo } from '@/lib/api/client';
import type { Message } from '@/i18n';
import { Note } from '@/types/note.types';
import { withIdValidation } from '@/lib/utils/validators';
import {
    GHOST_ID,
    buildGhostNote,
    shouldHaunt,
} from '@/lib/system/ghostFile';
import { formatLog } from '@/lib/system/requestLog';
import { getSystemState, markSecretFound } from '@/hooks/useSystemState';

interface UseTrashReturn {
    trashedNotes: Note[];
    isLoading: boolean;
    error: Message | null;

    restoreNote: (id: string) => Promise<boolean>;
    deletePermanently: (id: string) => Promise<boolean>;
    refreshTrash: () => Promise<void>;
    clearError: () => void;
}

/**
 * Cuándo se descartó el archivo fantasma. A nivel de módulo y no de estado
 * porque la papelera se monta y se desmonta al cambiar de vista: en un `useRef`
 * se olvidaría en cuanto salís, y el fantasma volvería en el acto.
 */
let ghostDismissedAt: number | null = null;

export const useTrash = (): UseTrashReturn => {
    const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Message | null>(null);

    /**
     * Carga las notas en papelera
     */
    const loadTrash = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { notes } = await notesApi.listTrash(1, 100);

            // El archivo fantasma se inyecta acá y sólo acá: nunca existe en la
            // base de datos. Su contenido es el registro real de peticiones de
            // esta pestaña, así que es coherente que muera con ella.
            const system = getSystemState();
            const haunted = shouldHaunt({
                sessionMs: Date.now() - system.sessionStart,
                notesCount: notes.length + system.permanentDeletes,
                dismissedAt: ghostDismissedAt,
                now: Date.now(),
            });

            if (haunted) {
                markSecretFound('ghost-file');
                setTrashedNotes([buildGhostNote(formatLog()), ...notes]);
            } else {
                setTrashedNotes(notes);
            }
        } catch (err) {
            const message = getErrorInfo(err);
            setError(message);
            setTrashedNotes([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Restaura una nota desde la papelera
     * Usa withIdValidation para validación centralizada
     */
    const restoreNote = useCallback(async (id: string): Promise<boolean> => {
        // Restaurarlo tampoco sale a la red: se descarta, igual que borrarlo.
        if (id === GHOST_ID) {
            ghostDismissedAt = Date.now();
            setTrashedNotes((prev) => prev.filter((note) => note._id !== GHOST_ID));
            return true;
        }

        try {
            setError(null);

            // Usar wrapper centralizado para validación de ID
            await withIdValidation(id, () => notesApi.restore(id));

            // Remover del estado local
            setTrashedNotes((prev) => prev.filter((note) => note._id !== id));

            return true;
        } catch (err) {
            const message = getErrorInfo(err);
            setError(message);
            return false;
        }
    }, []);

    /**
     * Elimina permanentemente una nota
     * Usa withIdValidation para validación centralizada
     */
    const deletePermanently = useCallback(async (id: string): Promise<boolean> => {
        // El fantasma no existe en el servidor: borrarlo se simula. Sin esto, la
        // llamada saldría con un id inválido y además gastaría una de las diez
        // bajas que el backend permite cada quince minutos.
        if (id === GHOST_ID) {
            ghostDismissedAt = Date.now();
            setTrashedNotes((prev) => prev.filter((note) => note._id !== GHOST_ID));
            return true;
        }

        try {
            setError(null);

            // Usar wrapper centralizado para validación de ID
            await withIdValidation(id, () => notesApi.deletePermanently(id));

            // Remover del estado local
            setTrashedNotes((prev) => prev.filter((note) => note._id !== id));

            return true;
        } catch (err) {
            const message = getErrorInfo(err);
            setError(message);
            return false;
        }
    }, []);

    /**
     * Refresca la lista de papelera
     */
    const refreshTrash = useCallback(async () => {
        await loadTrash();
    }, [loadTrash]);

    /**
     * Limpia el error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Carga inicial
     */
    useEffect(() => {
        void loadTrash();
    }, [loadTrash]);

    return {
        trashedNotes,
        isLoading,
        error,
        restoreNote,
        deletePermanently,
        refreshTrash,
        clearError,
    };
};