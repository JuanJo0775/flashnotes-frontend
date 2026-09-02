import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { notesApi } from '@/lib/api/notes.api';
import type { Note } from '@/types/note.types';

jest.mock('@/lib/api/notes.api', () => ({
    notesApi: {
        undo: jest.fn(),
        redo: jest.fn(),
    },
}));

// El hook guarda la CLAVE del error, sin traducir, para que el texto siga al
// idioma en pantalla. El mock devuelve una clave real, no una cadena suelta.
jest.mock('@/lib/api/client', () => ({
    getErrorInfo: jest.fn(() => ({ key: 'error.UNKNOWN' })),
}));

const undoMock = notesApi.undo as jest.Mock;
const redoMock = notesApi.redo as jest.Mock;

describe('useUndoRedo', () => {
    const noteId = '507f1f77bcf86cd799439011';

    const note: Note = {
        _id: noteId,
        title: 'Título',
        content: 'Contenido',
        versions: [{ title: 'Viejo', content: 'Viejo', editedAt: '2026-01-01T00:00:00Z' }],
        redoStack: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('undo devuelve la nota del servidor', async () => {
        undoMock.mockResolvedValue(note);

        const { result } = renderHook(() => useUndoRedo());

        await act(async () => {
            expect(await result.current.undo(noteId)).toBe(note);
        });

        expect(undoMock).toHaveBeenCalledWith(noteId);
        expect(result.current.error).toBeNull();
    });

    test('redo devuelve la nota del servidor', async () => {
        redoMock.mockResolvedValue(note);

        const { result } = renderHook(() => useUndoRedo());

        await act(async () => {
            expect(await result.current.redo(noteId)).toBe(note);
        });

        expect(redoMock).toHaveBeenCalledWith(noteId);
        expect(result.current.error).toBeNull();
    });

    test('publica el error y devuelve null cuando la petición falla', async () => {
        undoMock.mockRejectedValue(new Error('fallo'));

        const { result } = renderHook(() => useUndoRedo());

        await act(async () => {
            expect(await result.current.undo(noteId)).toBeNull();
        });

        expect(result.current.error).toEqual({ key: 'error.UNKNOWN' });
    });

    test('rechaza un ID que no es un ObjectId, sin llamar a la API', async () => {
        const { result } = renderHook(() => useUndoRedo());

        await act(async () => {
            expect(await result.current.undo('no-es-un-id')).toBeNull();
        });

        expect(undoMock).not.toHaveBeenCalled();
        expect(result.current.error).toEqual({ key: 'error.INVALID_ID_FORMAT' });
    });

    test('ignora un segundo undo mientras el primero sigue en vuelo', async () => {
        // Reproduce el spam de clics: el guard vive en una ref, no en el estado,
        // porque dos clics dentro del mismo ciclo de render leían el valor viejo
        // de isProcessing y las dos peticiones salían a la red.
        let resolveFirst: (n: Note) => void = () => {};
        undoMock.mockImplementation(
            () => new Promise<Note>((resolve) => { resolveFirst = resolve; })
        );

        const { result } = renderHook(() => useUndoRedo());

        let second: Note | null = note;

        await act(async () => {
            const first = result.current.undo(noteId);
            second = await result.current.undo(noteId);
            resolveFirst(note);
            await first;
        });

        expect(second).toBeNull();
        expect(undoMock).toHaveBeenCalledTimes(1);
    });
});
