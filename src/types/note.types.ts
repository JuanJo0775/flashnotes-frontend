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