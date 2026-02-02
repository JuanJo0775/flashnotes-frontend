import { create } from 'zustand';
import type { Note } from '@/types/note.types';

interface NotesStore {
    notes: Note[];
    isLoading: boolean;
    error: string | null;
    setNotes: (notes: Note[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useNotesStore = create<NotesStore>((set) => ({
    notes: [],
    isLoading: false,
    error: null,
    setNotes: (notes) => set({ notes }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
}));