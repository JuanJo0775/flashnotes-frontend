// src/hooks/useNotes.ts
import { useState, useEffect, useCallback } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { getErrorMessage } from '@/lib/api/client';
import { Note, CreateNoteDto, UpdateNoteDto } from '@/types/note.types';

interface UseNotesReturn {
    notes: Note[];
    isLoading: boolean;
    error: string | null;

    // Acciones
    createNote: (data: CreateNoteDto) => Promise<Note | null>;
    updateNote: (id: string, data: UpdateNoteDto) => Promise<Note | null>;
    deleteNote: (id: string) => Promise<boolean>;
    refreshNotes: () => Promise<void>;

    // Utilidades
    clearError: () => void;
}

export const useNotes = (): UseNotesReturn => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Carga inicial de notas
     */
    const loadNotes = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const data = await notesApi.listActive();
            setNotes(data);
        } catch (err) {
            const message = getErrorMessage(err);
            setError(message);
            console.error('Error cargando notas:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Crea una nueva nota
     * Validación ANTES de enviar al backend
     */
    const createNote = useCallback(async (data: CreateNoteDto): Promise<Note | null> => {
        try {
            setError(null);

            // Validación del lado del cliente
            if (!data.title.trim()) {
                throw new Error('El título no puede estar vacío');
            }

            if (!data.content.trim()) {
                throw new Error('El contenido no puede estar vacío');
            }

            const newNote = await notesApi.create(data);

            // Actualizar estado: agregar al inicio
            setNotes((prev) => [newNote, ...prev]);

            return newNote;
        } catch (err) {
            const message = getErrorMessage(err);
            setError(message);
            console.error('Error creando nota:', err);
            return null;
        }
    }, []);

    /**
     * Actualiza una nota existente
     */
    const updateNote = useCallback(async (
        id: string,
        data: UpdateNoteDto
    ): Promise<Note | null> => {
        try {
            setError(null);

            // Validación básica
            if (data.title !== undefined && !data.title.trim()) {
                throw new Error('El título no puede estar vacío');
            }

            if (data.content !== undefined && !data.content.trim()) {
                throw new Error('El contenido no puede estar vacío');
            }

            const updatedNote = await notesApi.update(id, data);

            // Actualizar estado: reemplazar la nota
            setNotes((prev) =>
                prev.map((note) => (note._id === id ? updatedNote : note))
            );

            return updatedNote;
        } catch (err) {
            const message = getErrorMessage(err);
            setError(message);
            console.error('Error actualizando nota:', err);
            return null;
        }
    }, []);

    /**
     * Mueve una nota a la papelera
     */
    const deleteNote = useCallback(async (id: string): Promise<boolean> => {
        try {
            setError(null);

            await notesApi.moveToTrash(id);

            // Remover del estado local
            setNotes((prev) => prev.filter((note) => note._id !== id));

            return true;
        } catch (err) {
            const message = getErrorMessage(err);
            setError(message);
            console.error('Error eliminando nota:', err);
            return false;
        }
    }, []);

    /**
     * Refresca la lista de notas
     */
    const refreshNotes = useCallback(async () => {
        await loadNotes();
    }, [loadNotes]);

    /**
     * Limpia el error actual
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Carga inicial
     */
    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    return {
        notes,
        isLoading,
        error,
        createNote,
        updateNote,
        deleteNote,
        refreshNotes,
        clearError,
    };
};