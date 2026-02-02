import { apiClient } from './client';
import type { HistoryEntry, HistoryResponse } from '@/types/history.types';

export const historyApi = {
    // Obtener historial de una nota
    getHistory: async (noteId: string): Promise<HistoryResponse> => {
        const { data } = await apiClient.get(`/notes/${noteId}/history`);
        return data;
    },

    // Restaurar a una versión específica
    restoreVersion: async (noteId: string, versionId: string): Promise<void> => {
        await apiClient.post(`/notes/${noteId}/history/${versionId}/restore`);
    },
};