// src/lib/api/notes.api.ts

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

    // Eliminar nota (mover a papelera)
    moveToTrash: async (id: string): Promise<void> => {
        await apiClient.post(`/notes/${id}/trash`);
    },

    // Restaurar nota de la papelera
    restore: async (id: string): Promise<Note> => {
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

    // UNDO: deshacer último cambio
    undo: async (id: string): Promise<Note> => {
        const { data } = await apiClient.post(`/notes/${id}/undo`);
        return data;
    },

    // REDO: rehacer cambio
    redo: async (id: string): Promise<Note> => {
        const { data } = await apiClient.post(`/notes/${id}/redo`);
        return data;
    },

    // Obtener historial de versiones
    getHistory: async (id: string): Promise<any[]> => {
        const { data } = await apiClient.get(`/notes/${id}/history`);
        return data;
    },

    // Restaurar a una versión específica
    restoreVersion: async (id: string, versionIndex: number): Promise<Note> => {
        const { data } = await apiClient.post(`/notes/${id}/history/${versionIndex}/restore`);
        return data;
    },
};
