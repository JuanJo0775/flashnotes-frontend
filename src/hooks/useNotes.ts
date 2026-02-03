// src/hooks/useNotes.ts
import { useState, useEffect, useCallback } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { getErrorMessage } from '@/lib/api/client';
import { Note, CreateNoteDto, UpdateNoteDto } from '../types/note.types';
import { isValidObjectId } from '@/lib/utils/validators';

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

    // Compatibilidad: alias
    refetch?: () => Promise<void>;
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

            // VALIDACIÓN: Título no puede estar vacío
            if (!data.title || !data.title.trim()) {
                const msg = 'El título no puede estar vacío';
                setError(msg);
                console.error(msg);
                return null;
            }

            // VALIDACIÓN: Título no debe exceder límite
            if (data.title.length > 100) {
                const msg = 'El título no puede superar 100 caracteres';
                setError(msg);
                return null;
            }

            // Permitir contenido vacío en la creación

            // Siempre llamar al backend y usar la respuesta del servidor
            const newNote = await notesApi.create(data);

            // Validar que el backend devolvió un _id válido
            if (!isValidObjectId(newNote._id)) {
                throw new Error('La nota no fue creada correctamente en el servidor');
            }

            // Actualizar estado: agregar al inicio usando exactamente el objeto devuelto
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
     * Validación ANTES de enviar al backend
     */
    const updateNote = useCallback(async (
        id: string,
        data: UpdateNoteDto
    ): Promise<Note | null> => {
        try {
            setError(null);

            // VALIDACIÓN: ID debe ser válido
            if (!id || !isValidObjectId(id)) {
                const msg = 'ID inválido para actualizar nota';
                setError(msg);
                console.error(msg);
                return null;
            }

            // VALIDACIÓN: si se actualiza título, no puede estar vacío
            if (data.title !== undefined && !data.title.trim()) {
                const msg = 'El título no puede estar vacío';
                setError(msg);
                return null;
            }

            // Llamar al backend
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
     * Mueve una nota a la papelera (soft delete)
     * Validación ANTES de enviar al backend
     */
    const deleteNote = useCallback(async (id: string): Promise<boolean> => {
        try {
            setError(null);

            // VALIDACIÓN: ID debe ser válido
            if (!id || !isValidObjectId(id)) {
                const msg = 'ID inválido para eliminar nota';
                setError(msg);
                console.error(msg);
                return false;
            }

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

    // Alias por compatibilidad: `refetch` es usado en algunos componentes
    const refetch = refreshNotes;

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
        refetch,
    };
};