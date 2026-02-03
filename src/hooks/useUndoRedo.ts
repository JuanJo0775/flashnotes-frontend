// src/hooks/useUndoRedo.ts

import { useState, useCallback } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import type { Note } from '@/types/note.types';

interface UseUndoRedoReturn {
    canUndo: boolean;
    canRedo: boolean;
    undo: () => Promise<Note | null>;
    redo: () => Promise<Note | null>;
    isProcessing: boolean;
}

export function useUndoRedo(noteId: string | null): UseUndoRedoReturn {
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const undo = useCallback(async (): Promise<Note | null> => {
        if (!noteId || !canUndo) return null;

        setIsProcessing(true);
        try {
            const updatedNote = await notesApi.undo(noteId);
            // Actualizar estados basados en la respuesta
            setCanUndo(updatedNote.versions && updatedNote.versions.length > 0);
            setCanRedo(updatedNote.redoStack && updatedNote.redoStack.length > 0);
            return updatedNote;
        } catch (error) {
            console.error('Error undoing:', error);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [noteId, canUndo]);

    const redo = useCallback(async (): Promise<Note | null> => {
        if (!noteId || !canRedo) return null;

        setIsProcessing(true);
        try {
            const updatedNote = await notesApi.redo(noteId);
            setCanUndo(updatedNote.versions && updatedNote.versions.length > 0);
            setCanRedo(updatedNote.redoStack && updatedNote.redoStack.length > 0);
            return updatedNote;
        } catch (error) {
            console.error('Error redoing:', error);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [noteId, canRedo]);

    // Actualizar estados cuando cambia la nota
    const updateUndoRedoState = useCallback((note: Note) => {
        setCanUndo((note as any).versions?.length > 0);
        setCanRedo((note as any).redoStack?.length > 0);
    }, []);

    return {
        canUndo,
        canRedo,
        undo,
        redo,
        isProcessing,
    };
}
