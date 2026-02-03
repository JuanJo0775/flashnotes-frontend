// src/lib/api/notes.api.ts
import { apiClient } from './client';
import { Note, CreateNoteDto, UpdateNoteDto } from '@/types/note.types';

/**
 * API de Notas - Refleja EXACTAMENTE las rutas del backend
 * Backend base path: /api/notes
 */
class NotesApi {
    private readonly basePath = '/notes';

    /**
     * POST /api/notes
     * Crea una nueva nota
     */
    async create(data: CreateNoteDto): Promise<Note> {
        const response = await apiClient.post<Note>(this.basePath, data);
        return response.data;
    }

    /**
     * GET /api/notes
     * Lista todas las notas activas (no eliminadas)
     */
    async listActive(): Promise<Note[]> {
        const response = await apiClient.get<Note[]>(this.basePath);
        return response.data;
    }

    /**
     * PATCH /api/notes/:id
     * Actualiza una nota existente
     */
    async update(id: string, data: UpdateNoteDto): Promise<Note> {
        const response = await apiClient.patch<Note>(`${this.basePath}/${id}`, data);
        return response.data;
    }

    /**
     * POST /api/notes/:id/undo
     * Deshace el último cambio en una nota
     */
    async undo(id: string): Promise<Note> {
        const response = await apiClient.post<Note>(`${this.basePath}/${id}/undo`);
        return response.data;
    }

    /**
     * POST /api/notes/:id/redo
     * Rehace el último cambio deshecho
     */
    async redo(id: string): Promise<Note> {
        const response = await apiClient.post<Note>(`${this.basePath}/${id}/redo`);
        return response.data;
    }

    /**
     * GET /api/notes/trash
     * Lista notas en la papelera
     */
    async listTrash(): Promise<Note[]> {
        const response = await apiClient.get<Note[]>(`${this.basePath}/trash`);
        return response.data;
    }

    /**
     * PATCH /api/notes/:id/trash
     * Mueve una nota a la papelera
     */
    async moveToTrash(id: string): Promise<Note> {
        const response = await apiClient.patch<Note>(`${this.basePath}/${id}/trash`);
        return response.data;
    }

    /**
     * PATCH /api/notes/:id/restore
     * Restaura una nota desde la papelera
     */
    async restore(id: string): Promise<Note> {
        const response = await apiClient.patch<Note>(`${this.basePath}/${id}/restore`);
        return response.data;
    }

    /**
     * DELETE /api/notes/:id/permanent
     * Elimina permanentemente una nota (solo si está en papelera)
     */
    async deletePermanently(id: string): Promise<void> {
        await apiClient.delete(`${this.basePath}/${id}/permanent`);
    }
}

export const notesApi = new NotesApi();