// src/hooks/useNotes.ts
import { useState, useEffect, useCallback } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { getErrorMessage } from '@/lib/api/client';
import { Note, CreateNoteDto, UpdateNoteDto } from '../types/note.types';
import { 
    isValidObjectId, 
    validateTitle, 
    validateContent,
    withIdValidation 
} from '@/lib/utils/validators';

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
            
            // Manejar respuesta con o sin paginación
            if (Array.isArray(data)) {
                setNotes(data);
            } else if (data && 'notes' in data) {
                setNotes(data.notes);
            } else {
                setNotes([]);
            }
        } catch (err) {
            const message = getErrorMessage(err);
            setError(message);
            console.error('Error cargando notas:', err);
            // Asegurar que notes siempre sea un array incluso en error
            setNotes([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Crea una nueva nota
     * Validación ANTES de enviar al backend usando validators centralizados
     */
    const createNote = useCallback(async (data: CreateNoteDto): Promise<Note | null> => {
        try {
            setError(null);

            // VALIDACIÓN: Validar título usando función centralizada
            const titleValidation = validateTitle(data.title);
            if (!titleValidation.valid) {
                setError(titleValidation.error || 'Título inválido');
                return null;
            }

            // VALIDACIÓN: Validar contenido
            const contentValidation = validateContent(data.content || '');
            if (!contentValidation.valid) {
                setError(contentValidation.error || 'Contenido inválido');
                return null;
            }

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
     * Validación ANTES de enviar al backend usando validators centralizados y withIdValidation
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

            // VALIDACIÓN: si se actualiza título, validar usando función centralizada
            if (data.title !== undefined) {
                const titleValidation = validateTitle(data.title);
                if (!titleValidation.valid) {
                    setError(titleValidation.error || 'Título inválido');
                    return null;
                }
            }

            // VALIDACIÓN: si se actualiza contenido, validar
            if (data.content !== undefined) {
                const contentValidation = validateContent(data.content);
                if (!contentValidation.valid) {
                    setError(contentValidation.error || 'Contenido inválido');
                    return null;
                }
            }

            // Llamar al backend con validación de ID
            const updatedNote = await withIdValidation(id, () => notesApi.update(id, data));

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
     * Usa withIdValidation para validación centralizada
     */
    const deleteNote = useCallback(async (id: string): Promise<boolean> => {
        try {
            setError(null);

            // Usar wrapper centralizado para validación de ID
            await withIdValidation(id, () => notesApi.moveToTrash(id));

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