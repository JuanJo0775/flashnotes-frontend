// src/lib/api/notes.api.ts
import { apiClient } from './client';
import { Note, CreateNoteDto, UpdateNoteDto } from '@/types/note.types';
import type { ApiResponse, PaginatedResponse, PaginationMetadata } from '@/types/api.types';
import { isValidObjectId } from '@/lib/utils/validators';

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

        // Asegurar que el backend devolvió un _id válido
        const note = response.data.data;
        if (!isValidObjectId(note._id)) {
            throw new Error('ID de servidor inválido');
        }

        return note;
    }

    /**
     * GET /api/notes
     * Lista todas las notas activas (no eliminadas)
     * Soporta paginación opcional: ?page=1&limit=20
     */
    async listActive(page?: number, limit?: number): Promise<Note[] | { notes: Note[]; pagination: PaginationMetadata }> {
        const params = new URLSearchParams();
        if (page !== undefined) params.append('page', page.toString());
        if (limit !== undefined) params.append('limit', limit.toString());

        const url = params.toString() ? `${this.basePath}?${params.toString()}` : this.basePath;
        const response = await apiClient.get<PaginatedResponse<Note>>(url);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error cargando notas');
        }

        // Si hay paginación en la respuesta, retornar con metadata
        if (response.data.pagination) {
            return {
                notes: response.data.data || [],
                pagination: response.data.pagination
            };
        }

        // Sin paginación, retornar solo el array (compatible hacia atrás)
        return response.data.data || [];
    }

    /**
     * PATCH /api/notes/:id
     * Actualiza una nota existente
     */
    async update(id: string, data: UpdateNoteDto): Promise<Note> {
        const url = `${this.basePath}/${id}`;
        console.debug(`[NotesApi.update] Sending PATCH request`, {
            id,
            url,
            data,
            timestamp: new Date().toISOString()
        });

        const response = await apiClient.patch<ApiResponse<Note>>(url, data);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error actualizando nota');
        }

        if (!response.data.data) {
            throw new Error('Respuesta del servidor inválida');
        }

        return response.data.data;
    }

    /**
     * PATCH /api/notes/:id/undo
     * Deshace el último cambio en una nota
     */
    async undo(id: string): Promise<Note> {
        const response = await apiClient.patch<ApiResponse<Note>>(`${this.basePath}/${id}/undo`);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error deshaciendo cambio');
        }

        if (!response.data.data) {
            throw new Error('Respuesta del servidor inválida');
        }

        return response.data.data;
    }

    /**
     * PATCH /api/notes/:id/redo
     * Rehace el último cambio deshecho
     */
    async redo(id: string): Promise<Note> {
        const response = await apiClient.patch<ApiResponse<Note>>(`${this.basePath}/${id}/redo`);

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
     * Soporta paginación opcional: ?page=1&limit=20
     */
    async listTrash(page?: number, limit?: number): Promise<Note[] | { notes: Note[]; pagination: PaginationMetadata }> {
        const params = new URLSearchParams();
        if (page !== undefined) params.append('page', page.toString());
        if (limit !== undefined) params.append('limit', limit.toString());

        const url = params.toString() ? `${this.basePath}/trash?${params.toString()}` : `${this.basePath}/trash`;
        console.debug(`[NotesApi.listTrash] Sending GET request`, {
            url,
            timestamp: new Date().toISOString()
        });

        const response = await apiClient.get<PaginatedResponse<Note>>(url);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error cargando papelera');
        }

        // Si hay paginación en la respuesta, retornar con metadata
        if (response.data.pagination) {
            return {
                notes: response.data.data || [],
                pagination: response.data.pagination
            };
        }

        // Sin paginación, retornar solo el array (compatible hacia atrás)
        return response.data.data || [];
    }

    /**
     * PATCH /api/notes/:id/trash
     * Mueve una nota a la papelera
     */
    async moveToTrash(id: string): Promise<Note> {
        const url = `${this.basePath}/${id}/trash`;
        console.debug(`[NotesApi.moveToTrash] Sending PATCH request`, {
            id,
            url,
            timestamp: new Date().toISOString()
        });

        const response = await apiClient.patch<ApiResponse<Note>>(url);

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
        const response = await apiClient.delete<ApiResponse<void>>(`${this.basePath}/${id}/permanent`);

        // Ahora el backend devuelve 200 con body
        if (!response.data.success) {
            throw new Error(response.data.message || 'Error eliminando nota');
        }
    }
}

export const notesApi = new NotesApi();