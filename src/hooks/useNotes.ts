// src/hooks/useNotes.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notesApi } from '@/lib/api/notes.api';
import { getErrorMessage } from '@/lib/api/client';
import type { Note, CreateNoteDto, UpdateNoteDto } from '@/types/note.types';
import { isValidObjectId, validateTitle, validateContent } from '@/lib/utils/validators';

/** Cuántas notas se piden por página. */
const PAGE_SIZE = 50;

interface UseNotesReturn {
    notes: Note[];
    isLoading: boolean;
    /** Hay más páginas por cargar en el servidor. */
    hasMore: boolean;
    /** Se está cargando la siguiente página. */
    isLoadingMore: boolean;
    /** Total de notas en el servidor, no sólo las cargadas. */
    total: number;
    error: string | null;

    createNote: (data: CreateNoteDto) => Promise<Note | null>;
    updateNote: (id: string, data: UpdateNoteDto) => Promise<Note | null>;
    moveToTrash: (id: string) => Promise<boolean>;
    loadMore: () => Promise<void>;
    refreshNotes: () => Promise<void>;
    clearError: () => void;
}

export const useNotes = (): UseNotesReturn => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    // Evita que dos cargas simultáneas se pisen (p. ej. montaje + "cargar más").
    const loadingRef = useRef(false);

    const loadFirstPage = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;

        try {
            setIsLoading(true);
            setError(null);

            const { notes: fetched, pagination } = await notesApi.listActive(1, PAGE_SIZE);

            setNotes(fetched);
            setPage(1);
            setTotal(pagination?.total ?? fetched.length);
            setHasMore(pagination ? pagination.page < pagination.pages : false);
        } catch (err) {
            setError(getErrorMessage(err));
            setNotes([]);
            setHasMore(false);
        } finally {
            setIsLoading(false);
            loadingRef.current = false;
        }
    }, []);

    /**
     * Carga la siguiente página y la añade al final.
     *
     * El backend siempre paginó, pero el cliente nunca mandaba `page`, así que
     * a partir de la nota 21 las notas existían y no había forma de verlas.
     */
    const loadMore = useCallback(async () => {
        if (loadingRef.current || !hasMore) return;
        loadingRef.current = true;

        const nextPage = page + 1;

        try {
            setIsLoadingMore(true);
            setError(null);

            const { notes: fetched, pagination } = await notesApi.listActive(
                nextPage,
                PAGE_SIZE
            );

            setNotes((prev) => {
                const seen = new Set(prev.map((n) => n._id));
                return [...prev, ...fetched.filter((n) => !seen.has(n._id))];
            });
            setPage(nextPage);
            setTotal(pagination?.total ?? total);
            setHasMore(pagination ? pagination.page < pagination.pages : false);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoadingMore(false);
            loadingRef.current = false;
        }
    }, [hasMore, page, total]);

    const createNote = useCallback(async (data: CreateNoteDto): Promise<Note | null> => {
        setError(null);

        const titleCheck = validateTitle(data.title);
        if (!titleCheck.valid) {
            setError(titleCheck.error ?? 'Título inválido');
            return null;
        }

        const contentCheck = validateContent(data.content ?? '');
        if (!contentCheck.valid) {
            setError(contentCheck.error ?? 'Contenido inválido');
            return null;
        }

        try {
            const newNote = await notesApi.create(data);
            setNotes((prev) => [newNote, ...prev]);
            setTotal((t) => t + 1);
            return newNote;
        } catch (err) {
            setError(getErrorMessage(err));
            return null;
        }
    }, []);

    const updateNote = useCallback(
        async (id: string, data: UpdateNoteDto): Promise<Note | null> => {
            setError(null);

            if (!isValidObjectId(id)) {
                setError('ID inválido para actualizar la nota');
                return null;
            }

            if (data.title !== undefined) {
                const titleCheck = validateTitle(data.title);
                if (!titleCheck.valid) {
                    setError(titleCheck.error ?? 'Título inválido');
                    return null;
                }
            }

            if (data.content !== undefined) {
                const contentCheck = validateContent(data.content);
                if (!contentCheck.valid) {
                    setError(contentCheck.error ?? 'Contenido inválido');
                    return null;
                }
            }

            try {
                const updated = await notesApi.update(id, data);
                setNotes((prev) => prev.map((n) => (n._id === id ? updated : n)));
                return updated;
            } catch (err) {
                setError(getErrorMessage(err));
                return null;
            }
        },
        []
    );

    const moveToTrash = useCallback(async (id: string): Promise<boolean> => {
        setError(null);

        if (!isValidObjectId(id)) {
            setError('ID inválido para mover la nota a la papelera');
            return false;
        }

        try {
            await notesApi.moveToTrash(id);
            setNotes((prev) => prev.filter((n) => n._id !== id));
            setTotal((t) => Math.max(0, t - 1));
            return true;
        } catch (err) {
            setError(getErrorMessage(err));
            return false;
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);

    useEffect(() => {
        void loadFirstPage();
    }, [loadFirstPage]);

    return {
        notes,
        isLoading,
        isLoadingMore,
        hasMore,
        total,
        error,
        createNote,
        updateNote,
        moveToTrash,
        loadMore,
        refreshNotes: loadFirstPage,
        clearError,
    };
};
