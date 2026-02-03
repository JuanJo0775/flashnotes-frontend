'use client';

import { useState, useEffect } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import type { Note } from '@/types/note.types';

export const useTrash = () => {
    const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTrash = async () => {
        setIsLoading(true);
        try {
            const data = await notesApi.getTrash();
            setTrashedNotes(data);
            setError(null);
        } catch (err) {
            setError('Error al cargar la papelera');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const restoreNote = async (id: string) => {
        try {
            await notesApi.restore(id);
            setTrashedNotes(trashedNotes.filter(n => n._id !== id));
        } catch (err) {
            setError('Error al restaurar la nota');
            throw err;
        }
    };

    const deletePermanently = async (id: string) => {
        try {
            await notesApi.deletePermanently(id);
            setTrashedNotes(trashedNotes.filter(n => n._id !== id));
        } catch (err) {
            setError('Error al eliminar permanentemente');
            throw err;
        }
    };

    useEffect(() => {
        fetchTrash();
    }, []);

    return {
        trashedNotes,
        isLoading,
        error,
        restoreNote,
        deletePermanently,
        refetch: fetchTrash,
    };
};
