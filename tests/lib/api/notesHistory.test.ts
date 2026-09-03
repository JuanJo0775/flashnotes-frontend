// tests/lib/api/notesHistory.test.ts
import { notesApi } from '@/lib/api/notes.api';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
    apiClient: { get: jest.fn() },
}));

const getMock = apiClient.get as jest.Mock;

const NOTE_ID = '507f1f77bcf86cd799439011';

const versiones = [
    { title: 'v1', content: 'uno', editedAt: '2026-09-01T14:41:55.000Z' },
    { title: 'v2', content: 'dos', editedAt: '2026-09-01T14:49:03.000Z' },
];

beforeEach(() => {
    jest.clearAllMocks();
});

describe('notesApi.history', () => {
    // La ruta existe en el backend desde siempre (notes.routes.js) y el
    // frontend nunca la había llamado: son las actas que la máquina viene
    // levantando y nadie leyó.
    test('pide las actas de la nota a su ruta', async () => {
        getMock.mockResolvedValue({
            data: { success: true, data: { versions: versiones, redoStack: [] } },
        });

        await notesApi.history(NOTE_ID);

        expect(getMock).toHaveBeenCalledWith(`/notes/${NOTE_ID}/history`);
    });

    test('devuelve las versiones y la pila de rehacer', async () => {
        getMock.mockResolvedValue({
            data: { success: true, data: { versions: versiones, redoStack: [] } },
        });

        const historia = await notesApi.history(NOTE_ID);

        expect(historia.versions).toHaveLength(2);
        expect(historia.redoStack).toEqual([]);
    });

    test('una nota sin historial devuelve listas vacías, no undefined', async () => {
        getMock.mockResolvedValue({ data: { success: true, data: {} } });

        const historia = await notesApi.history(NOTE_ID);

        expect(historia.versions).toEqual([]);
        expect(historia.redoStack).toEqual([]);
    });

    test('propaga el error del servidor con su mensaje', async () => {
        getMock.mockResolvedValue({
            data: { success: false, message: 'La nota solicitada no existe' },
        });

        await expect(notesApi.history(NOTE_ID)).rejects.toThrow(
            'La nota solicitada no existe'
        );
    });

    test('rechaza un id que no es un ObjectId sin salir a la red', async () => {
        await expect(notesApi.history('no-soy-un-id')).rejects.toThrow();

        expect(getMock).not.toHaveBeenCalled();
    });
});
