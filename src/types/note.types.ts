// src/types/note.types.ts

/**
 * Tipos de nota usados en frontend
 */
export interface Note {
    _id: string;
    title: string;
    content: string;
    createdAt?: string;
    updatedAt?: string;
    editedAt?: string;
    isDeleted?: boolean;
    // Historial de cambios (versiones anteriores)
    versions?: NoteVersion[];
    redoStack?: NoteVersion[];
}

export interface CreateNoteDto {
    title: string;
    content: string;
}

export interface UpdateNoteDto {
    title?: string;
    content?: string;
}

/**
 * Versión histórica de una nota (estructura interna del backend)
 */
export interface NoteVersion {
    title: string;
    content: string;
    editedAt: string;
}

/**
 * Nota completa con historial (estructura real del backend)
 */
export interface NoteWithHistory extends Note {
    versions: NoteVersion[];
    redoStack: NoteVersion[];
}

/**
 * Lo que devuelve GET /api/notes/:id/history.
 *
 * El backend viene guardando estas versiones desde siempre y hasta ahora nadie
 * las había pedido: la ruta existía, estaba probada, y el frontend no la
 * llamaba. Es lo que muestra el comando `//history`.
 */
export interface NoteHistory {
    versions: NoteVersion[];
    redoStack: NoteVersion[];
}
/**
 * Vistas de nivel superior de la app.
 * El editor es una sub-vista de las notas, no una pestaña propia.
 */
export type View = 'notes' | 'editor' | 'trash';

/** Estado del guardado automático, tal y como se le muestra al usuario. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
