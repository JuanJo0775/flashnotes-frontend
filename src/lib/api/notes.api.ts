import { apiClient } from './client';
import type { Note, CreateNoteDto, UpdateNoteDto } from '@/types/note.types';

export const notesApi = {
    // Obtener todas las notas activas
    getAll: async (): Promise<Note[]> => {
        const { data } = await apiClient.get('/notes');
        return data;
    },

    // Obtener una nota por ID
    getById: async (id: string): Promise<Note> => {
        const { data } = await apiClient.get(`/notes/${id}`);
        return data;
    },

    // Crear nueva nota
    create: async (noteData: CreateNoteDto): Promise<Note> => {
        const { data } = await apiClient.post('/notes', noteData);
        return data;
    },

    // Actualizar nota
    update: async (id: string, noteData: UpdateNoteDto): Promise<Note> => {
        const { data } = await apiClient.patch(`/notes/${id}`, noteData);
        return data;
    },

    // Eliminar nota (soft delete)
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/notes/${id}`);
    },

    // Restaurar nota de la papelera
    restore: async (id: string): Promise<Note> => {
        const { data } = await apiClient.patch(`/notes/${id}/restore`);
        return data;
    },

    // Obtener papelera
    getTrash: async (): Promise<Note[]> => {
        const { data } = await apiClient.get('/notes/trash');
        return data;
    },
};