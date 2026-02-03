// src/types/note.types.ts (agregar al final)

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
    editedAt: string;
}