// UBICACIÓN: src/lib/api/notes.api.ts
// ACCIÓN: REEMPLAZAR COMPLETO

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

    // Mover a papelera
    moveToTrash: async (id: string): Promise<void> => {
        await apiClient.post(`/notes/${id}/trash`);
    },

    // Restaurar de papelera
    restoreFromTrash: async (id: string): Promise<Note> => {
        const { data } = await apiClient.post(`/notes/${id}/restore`);
        return data;
    },

    // Eliminar permanentemente
    deletePermanently: async (id: string): Promise<void> => {
        await apiClient.delete(`/notes/${id}/permanent`);
    },

    // Obtener papelera
    getTrash: async (): Promise<Note[]> => {
        const { data } = await apiClient.get('/notes/trash');
        return data;
    },

    // UNDO
    undo: async (id: string): Promise<Note> => {
        const { data } = await apiClient.post(`/notes/${id}/undo`);
        return data;
    },

    // REDO
    redo: async (id: string): Promise<Note> => {
        const { data } = await apiClient.post(`/notes/${id}/redo`);
        return data;
    },
};
