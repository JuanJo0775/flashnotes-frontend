export interface HistoryEntry {
    _id: string;
    noteId: string;
    version: number;
    content: string;
    createdAt: string;
}

export interface HistoryResponse {
    history: HistoryEntry[];
    total: number;
}