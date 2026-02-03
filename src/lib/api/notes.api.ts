// src/lib/api/notes.api.ts
import { apiClient } from './client';
import { Note, CreateNoteDto, UpdateNoteDto } from '@/types/note.types';

/**
 * Interfaz de respuesta del backend
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    statusCode: number;
}

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
        const response = await apiClient.post<ApiResponse<Note>>(this.basePath, data);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error creando nota');
        }

        if (!response.data.data) {
            throw new Error('Respuesta del servidor inválida');
        }

        return response.data.data;
    }

    /**
     * GET /api/notes
     * Lista todas las notas activas (no eliminadas)
     */
    async listActive(): Promise<Note[]> {
        const response = await apiClient.get<ApiResponse<Note[]>>(this.basePath);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error cargando notas');
        }

        return response.data.data || [];
    }

    /**
     * PATCH /api/notes/:id
     * Actualiza una nota existente
     */
    async update(id: string, data: UpdateNoteDto): Promise<Note> {
        const response = await apiClient.patch<ApiResponse<Note>>(`${this.basePath}/${id}`, data);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error actualizando nota');
        }

        if (!response.data.data) {
            throw new Error('Respuesta del servidor inválida');
        }

        return response.data.data;
    }

    /**
     * POST /api/notes/:id/undo
     * Deshace el último cambio en una nota
     */
    async undo(id: string): Promise<Note> {
        const response = await apiClient.post<ApiResponse<Note>>(`${this.basePath}/${id}/undo`);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error deshaciendo cambio');
        }

        if (!response.data.data) {
            throw new Error('Respuesta del servidor inválida');
        }

        return response.data.data;
    }

    /**
     * POST /api/notes/:id/redo
     * Rehace el último cambio deshecho
     */
    async redo(id: string): Promise<Note> {
        const response = await apiClient.post<ApiResponse<Note>>(`${this.basePath}/${id}/redo`);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error rehaciendo cambio');
        }

        if (!response.data.data) {
            throw new Error('Respuesta del servidor inválida');
        }

        return response.data.data;
    }

    /**
     * GET /api/notes/trash
     * Lista notas en la papelera
     */
    async listTrash(): Promise<Note[]> {
        const response = await apiClient.get<ApiResponse<Note[]>>(`${this.basePath}/trash`);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error cargando papelera');
        }

        return response.data.data || [];
    }

    /**
     * PATCH /api/notes/:id/trash
     * Mueve una nota a la papelera
     */
    async moveToTrash(id: string): Promise<Note> {
        const response = await apiClient.patch<ApiResponse<Note>>(`${this.basePath}/${id}/trash`);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error moviendo nota a papelera');
        }

        if (!response.data.data) {
            throw new Error('Respuesta del servidor inválida');
        }

        return response.data.data;
    }

    /**
     * PATCH /api/notes/:id/restore
     * Restaura una nota desde la papelera
     */
    async restore(id: string): Promise<Note> {
        const response = await apiClient.patch<ApiResponse<Note>>(`${this.basePath}/${id}/restore`);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error restaurando nota');
        }

        if (!response.data.data) {
            throw new Error('Respuesta del servidor inválida');
        }

        return response.data.data;
    }

    /**
     * DELETE /api/notes/:id/permanent
     * Elimina permanentemente una nota (solo si está en papelera)
     */
    async deletePermanently(id: string): Promise<void> {
        const response = await apiClient.delete(`${this.basePath}/${id}/permanent`);

        // 204 No Content no devuelve success/data, solo headers
        if (response.status !== 204) {
            const data = response.data as ApiResponse<void>;
            if (!data.success) {
                throw new Error(data.message || 'Error eliminando nota');
            }
        }
    }
}

export const notesApi = new NotesApi();