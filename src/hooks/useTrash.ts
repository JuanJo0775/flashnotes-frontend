// src/hooks/useTrash.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { getErrorMessage } from '@/lib/api/client';
import { Note } from '@/types/note.types';
import { withIdValidation } from '@/lib/utils/validators';

interface UseTrashReturn {
    trashedNotes: Note[];
    isLoading: boolean;
    error: string | null;

    restoreNote: (id: string) => Promise<boolean>;
    deletePermanently: (id: string) => Promise<boolean>;
    refreshTrash: () => Promise<void>;
    clearError: () => void;
}

export const useTrash = (): UseTrashReturn => {
    const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Carga las notas en papelera
     */
    const loadTrash = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { notes } = await notesApi.listTrash(1, 100);
            setTrashedNotes(notes);
        } catch (err) {
            const message = getErrorMessage(err);
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
        try {
            setError(null);

            // Usar wrapper centralizado para validación de ID
            await withIdValidation(id, () => notesApi.restore(id));

            // Remover del estado local
            setTrashedNotes((prev) => prev.filter((note) => note._id !== id));

            return true;
        } catch (err) {
            const message = getErrorMessage(err);
            setError(message);
            return false;
        }
    }, []);

    /**
     * Elimina permanentemente una nota
     * Usa withIdValidation para validación centralizada
     */
    const deletePermanently = useCallback(async (id: string): Promise<boolean> => {
        try {
            setError(null);

            // Usar wrapper centralizado para validación de ID
            await withIdValidation(id, () => notesApi.deletePermanently(id));

            // Remover del estado local
            setTrashedNotes((prev) => prev.filter((note) => note._id !== id));

            return true;
        } catch (err) {
            const message = getErrorMessage(err);
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