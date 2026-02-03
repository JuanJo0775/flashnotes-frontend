// UBICACIÓN: src/hooks/useNotes.ts
// ACCIÓN: REEMPLAZAR COMPLETO

import { useState, useEffect, useCallback } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import type { Note, CreateNoteDto, UpdateNoteDto } from '@/types/note.types';

export const useNotes = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotes = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await notesApi.getAll();
            setNotes(data);
        } catch (err) {
            console.error('Error fetching notes:', err);
            setError('Error al cargar las notas');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createNote = async (noteData: CreateNoteDto): Promise<Note | null> => {
        try {
            setError(null);
            const newNote = await notesApi.create(noteData);
            setNotes(prev => [newNote, ...prev]);
            return newNote;
        } catch (err) {
            console.error('Error creating note:', err);
            setError('Error al crear la nota');
            return null;
        }
    };

    const updateNote = async (id: string, noteData: UpdateNoteDto): Promise<Note | null> => {
        try {
            setError(null);
            const updatedNote = await notesApi.update(id, noteData);
            setNotes(prev => prev.map(n => n._id === id ? updatedNote : n));
            return updatedNote;
        } catch (err) {
            console.error('Error updating note:', err);
            setError('Error al actualizar la nota');
            return null;
        }
    };

    const deleteNote = async (id: string): Promise<boolean> => {
        try {
            setError(null);
            await notesApi.moveToTrash(id);
            setNotes(prev => prev.filter(n => n._id !== id));
            return true;
        } catch (err) {
            console.error('Error deleting note:', err);
            setError('Error al eliminar la nota');
            return false;
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    return {
        notes,
        isLoading,
        error,
        createNote,
        updateNote,
        deleteNote,
        refetch: fetchNotes,
    };
};
