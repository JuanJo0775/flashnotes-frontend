// src/lib/api/notes.api.ts
import { apiClient } from './client';
import type {
    Note,
    CreateNoteDto,
    UpdateNoteDto,
    NoteHistory,
} from '@/types/note.types';
import type {
    ApiResponse,
    PaginatedResponse,
    PaginationMetadata,
} from '@/types/api.types';
import { isValidObjectId } from '@/lib/utils/validators';

export interface NotesPage {
    notes: Note[];
    pagination: PaginationMetadata | null;
}

/**
 * Cliente de la API de notas. Refleja exactamente las rutas del backend,
 * cuyo base path es /api/notes.
 */
class NotesApi {
    private readonly basePath = '/notes';

    /** Extrae `data` verificando el contrato de respuesta. */
    private unwrap<T>(response: { data: ApiResponse<T> }, action: string): T {
        const body = response.data;

        if (!body?.success) {
            throw new Error(body?.message || `Error al ${action}`);
        }

        if (body.data === undefined || body.data === null) {
            throw new Error(`El servidor no devolvió datos al ${action}`);
        }

        return body.data;
    }

    private buildListUrl(path: string, page?: number, limit?: number): string {
        const params = new URLSearchParams();
        if (page !== undefined) params.set('page', String(page));
        if (limit !== undefined) params.set('limit', String(limit));
        const qs = params.toString();
        return qs ? `${path}?${qs}` : path;
    }

    private async fetchPage(url: string, action: string): Promise<NotesPage> {
        const response = await apiClient.get<PaginatedResponse<Note>>(url);

        if (!response.data.success) {
            throw new Error(response.data.message || `Error al ${action}`);
        }

        return {
            notes: response.data.data ?? [],
            pagination: response.data.pagination ?? null,
        };
    }

    /** POST /api/notes */
    async create(data: CreateNoteDto): Promise<Note> {
        const response = await apiClient.post<ApiResponse<Note>>(this.basePath, data);
        const note = this.unwrap(response, 'crear la nota');

        if (!isValidObjectId(note._id)) {
            throw new Error('El servidor devolvió una nota sin ID válido');
        }

        return note;
    }

    /** GET /api/notes?page&limit */
    async listActive(page?: number, limit?: number): Promise<NotesPage> {
        return this.fetchPage(
            this.buildListUrl(this.basePath, page, limit),
            'cargar las notas'
        );
    }

    /** GET /api/notes/trash?page&limit */
    async listTrash(page?: number, limit?: number): Promise<NotesPage> {
        return this.fetchPage(
            this.buildListUrl(`${this.basePath}/trash`, page, limit),
            'cargar la papelera'
        );
    }

    /** PATCH /api/notes/:id */
    async update(id: string, data: UpdateNoteDto): Promise<Note> {
        const response = await apiClient.patch<ApiResponse<Note>>(
            `${this.basePath}/${id}`,
            data
        );
        return this.unwrap(response, 'actualizar la nota');
    }

    /** PATCH /api/notes/:id/undo */
    async undo(id: string): Promise<Note> {
        const response = await apiClient.patch<ApiResponse<Note>>(
            `${this.basePath}/${id}/undo`
        );
        return this.unwrap(response, 'deshacer el cambio');
    }

    /** PATCH /api/notes/:id/redo */
    async redo(id: string): Promise<Note> {
        const response = await apiClient.patch<ApiResponse<Note>>(
            `${this.basePath}/${id}/redo`
        );
        return this.unwrap(response, 'rehacer el cambio');
    }

    /**
     * GET /api/notes/:id/history
     *
     * Las versiones que el backend guarda por nota (hasta HISTORY_MAX). La ruta
     * está en el backend desde el principio; esta es la primera vez que el
     * frontend la usa.
     */
    async history(id: string): Promise<NoteHistory> {
        if (!isValidObjectId(id)) {
            throw new Error('ID inválido para consultar el historial');
        }

        const response = await apiClient.get<ApiResponse<Partial<NoteHistory>>>(
            `${this.basePath}/${id}/history`
        );
        const data = this.unwrap(response, 'consultar el historial');

        // Una nota sin ediciones no trae los arrays: se normalizan acá para que
        // quien los pinte no tenga que defenderse de undefined.
        return {
            versions: data.versions ?? [],
            redoStack: data.redoStack ?? [],
        };
    }

    /** PATCH /api/notes/:id/trash */
    async moveToTrash(id: string): Promise<Note> {
        const response = await apiClient.patch<ApiResponse<Note>>(
            `${this.basePath}/${id}/trash`
        );
        return this.unwrap(response, 'mover la nota a la papelera');
    }

    /** PATCH /api/notes/:id/restore */
    async restore(id: string): Promise<Note> {
        const response = await apiClient.patch<ApiResponse<Note>>(
            `${this.basePath}/${id}/restore`
        );
        return this.unwrap(response, 'restaurar la nota');
    }

    /** DELETE /api/notes/:id/permanent */
    async deletePermanently(id: string): Promise<void> {
        const response = await apiClient.delete<ApiResponse<void>>(
            `${this.basePath}/${id}/permanent`
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Error al eliminar la nota');
        }
    }
}

export const notesApi = new NotesApi();
