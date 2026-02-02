'use client';

import { useEffect } from 'react';
import { useNotesStore } from '@/store/notesStore';
import { notesApi } from '@/lib/api/notes.api';

export const useNotes = () => {
    const { notes, setNotes, isLoading, setLoading, error, setError } = useNotesStore();

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const data = await notesApi.getAll();
            setNotes(data);
            setError(null);
        } catch (err) {
            setError('Error al cargar las notas');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createNote = async (title: string, content: string) => {
        try {
            const newNote = await notesApi.create({ title, content });
            setNotes([newNote, ...notes]);
            return newNote;
        } catch (err) {
            setError('Error al crear la nota');
            throw err;
        }
    };

    const updateNote = async (id: string, updates: { title?: string; content?: string }) => {
        try {
            const updated = await notesApi.update(id, updates);
            setNotes(notes.map(n => n._id === id ? updated : n));
            return updated;
        } catch (err) {
            setError('Error al actualizar la nota');
            throw err;
        }
    };

    const deleteNote = async (id: string) => {
        try {
            await notesApi.delete(id);
            setNotes(notes.filter(n => n._id !== id));
        } catch (err) {
            setError('Error al eliminar la nota');
            throw err;
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

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