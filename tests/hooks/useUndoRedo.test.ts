import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { notesApi } from '@/lib/api/notes.api';
import { withIdValidation } from '@/lib/utils/validators';
import { getErrorMessage } from '@/lib/api/client';

jest.mock('@/lib/api/notes.api', () => ({
    notesApi: {
        undo: jest.fn(),
        redo: jest.fn(),
    }
}));

jest.mock('@/lib/utils/validators', () => ({
    withIdValidation: jest.fn((id: string, op: () => Promise<any>) => op()),
}));

jest.mock('@/lib/api/client', () => ({
    getErrorMessage: jest.fn(() => 'ERROR'),
}));

describe('useUndoRedo', () => {
    const noteId = '507f1f77bcf86cd799439011';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('undo actualiza flags correctamente', async () => {
        const note = {
            _id: noteId,
            title: 'Title',
            content: 'Content',
            versions: [{ title: 'Old', content: 'Old', editedAt: new Date().toISOString() }],
            redoStack: []
        };

        (notesApi.undo as jest.Mock).mockResolvedValue(note);

        const { result } = renderHook(() => useUndoRedo());

        await act(async () => {
            const res = await result.current.undo(noteId);
            expect(res).toBe(note);
        });

        expect(withIdValidation).toHaveBeenCalledWith(noteId, expect.any(Function));
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(false);
        expect(result.current.error).toBeNull();
    });

    test('redo actualiza flags correctamente', async () => {
        const note = {
            _id: noteId,
            title: 'Title',
            content: 'Content',
            versions: [],
            redoStack: [{ title: 'Next', content: 'Next', editedAt: new Date().toISOString() }]
        };

        (notesApi.redo as jest.Mock).mockResolvedValue(note);

        const { result } = renderHook(() => useUndoRedo());

        await act(async () => {
            const res = await result.current.redo(noteId);
            expect(res).toBe(note);
        });

        expect(withIdValidation).toHaveBeenCalledWith(noteId, expect.any(Function));
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(true);
        expect(result.current.error).toBeNull();
    });

    test('maneja errores y actualiza estado de error', async () => {
        (notesApi.undo as jest.Mock).mockRejectedValue(new Error('fail'));

        const { result } = renderHook(() => useUndoRedo());

        await act(async () => {
            const res = await result.current.undo(noteId);
            expect(res).toBeNull();
        });

        expect(getErrorMessage).toHaveBeenCalled();
        expect(result.current.error).toBe('ERROR');
    });
});
