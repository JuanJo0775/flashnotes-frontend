// src/hooks/useUndoRedo.ts
import { useState, useCallback } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { getErrorMessage } from '@/lib/api/client';
import { Note, NoteWithHistory } from '@/types/note.types';
import { isValidObjectId } from '@/lib/utils/validators';

interface UseUndoRedoReturn {
    canUndo: boolean;
    canRedo: boolean;
    isProcessing: boolean;
    error: string | null;

    undo: (noteId: string) => Promise<Note | null>;
    redo: (noteId: string) => Promise<Note | null>;
    clearError: () => void;
}

export const useUndoRedo = (): UseUndoRedoReturn => {
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Actualiza los flags de undo/redo basado en la nota
     */
    const updateFlags = useCallback((note: Note) => {
        const noteWithHistory = note as NoteWithHistory;

        setCanUndo(noteWithHistory.versions?.length > 0 || false);
        setCanRedo(noteWithHistory.redoStack?.length > 0 || false);
    }, []);

    /**
     * Deshace el último cambio
     */
    const undo = useCallback(async (noteId: string): Promise<Note | null> => {
        try {
            setIsProcessing(true);
            setError(null);

            if (!isValidObjectId(noteId)) {
                throw new Error('ID inválido para undo');
            }

            const updatedNote = await notesApi.undo(noteId);

            // Actualizar flags
            updateFlags(updatedNote);

            return updatedNote;
        } catch (err) {
            const message = getErrorMessage(err);
            setError(message);
            console.error('Error en undo:', err);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [updateFlags]);

    /**
     * Rehace el último cambio deshecho
     */
    const redo = useCallback(async (noteId: string): Promise<Note | null> => {
        try {
            setIsProcessing(true);
            setError(null);

            if (!isValidObjectId(noteId)) {
                throw new Error('ID inválido para redo');
            }

            const updatedNote = await notesApi.redo(noteId);

            // Actualizar flags
            updateFlags(updatedNote);

            return updatedNote;
        } catch (err) {
            const message = getErrorMessage(err);
            setError(message);
            console.error('Error en redo:', err);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [updateFlags]);

    /**
     * Limpia el error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        canUndo,
        canRedo,
        isProcessing,
        error,
        undo,
        redo,
        clearError,
    };
};