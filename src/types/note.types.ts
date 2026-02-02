export interface Note {
    _id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
}

export interface CreateNoteDto {
    title: string;
    content: string;
}

export interface UpdateNoteDto {
    title?: string;
    content?: string;
}

export type NoteStatus = 'active' | 'deleted' | 'loading';