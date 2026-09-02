// tests/hooks/useNoteCommands.test.ts
import { renderHook, act } from '@testing-library/react';
import { useNoteCommands } from '@/hooks/useNoteCommands';
import { notesApi } from '@/lib/api/notes.api';
import { getSystemState, setEffectsEnabled } from '@/hooks/useSystemState';

jest.mock('@/lib/api/notes.api', () => ({
    notesApi: { history: jest.fn() },
}));

const historyMock = notesApi.history as jest.Mock;

const NOTE_ID = '507f1f77bcf86cd799439011';

const opciones = () => ({
    notes: [{ title: 'Ideas.txt', chars: 120 }],
    onOpenDiagnostics: jest.fn(),
    onCollapse: jest.fn(),
    onClearNote: jest.fn(),
    onPlayPong: jest.fn(),
    onLeaveNote: jest.fn(),
    onWriteNote: jest.fn(),
});

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    setEffectsEnabled(true);
});

describe('useNoteCommands - qué ejecuta y qué no', () => {
    test('ejecuta un comando y publica su respuesta', async () => {
        const { result } = renderHook(() => useNoteCommands(opciones()));

        await act(async () => {
            await result.current.run('//version', NOTE_ID);
        });

        expect(result.current.response).toContain('FLASH-NOTES v1.0');
    });

    test('lo que no es un comando no se ejecuta ni deja respuesta', async () => {
        const { result } = renderHook(() => useNoteCommands(opciones()));

        let fueComando: boolean | undefined;
        await act(async () => {
            fueComando = await result.current.run('mis ideas sueltas', NOTE_ID);
        });

        expect(fueComando).toBe(false);
        expect(result.current.response).toBeNull();
    });

    test('avisa de que sí era un comando', async () => {
        const { result } = renderHook(() => useNoteCommands(opciones()));

        let fueComando: boolean | undefined;
        await act(async () => {
            fueComando = await result.current.run('//version', NOTE_ID);
        });

        expect(fueComando).toBe(true);
    });

    test('descartar borra la respuesta', async () => {
        const { result } = renderHook(() => useNoteCommands(opciones()));

        await act(async () => {
            await result.current.run('//version', NOTE_ID);
        });
        act(() => result.current.dismiss());

        expect(result.current.response).toBeNull();
    });
});

describe('useNoteCommands - efectos', () => {
    test('>diag abre el panel', async () => {
        const opts = opciones();
        const { result } = renderHook(() => useNoteCommands(opts));

        await act(async () => {
            await result.current.run('//diag', NOTE_ID);
        });

        expect(opts.onOpenDiagnostics).toHaveBeenCalled();
    });

    test('>panic dispara el colapso', async () => {
        const opts = opciones();
        const { result } = renderHook(() => useNoteCommands(opts));

        await act(async () => {
            await result.current.run('//panic', NOTE_ID);
        });

        expect(opts.onCollapse).toHaveBeenCalled();
    });

    test('>clear vacía la nota', async () => {
        const opts = opciones();
        const { result } = renderHook(() => useNoteCommands(opts));

        await act(async () => {
            await result.current.run('//clear', NOTE_ID);
        });

        expect(opts.onClearNote).toHaveBeenCalled();
    });

    test('>chaos off apaga los efectos de verdad', async () => {
        const { result } = renderHook(() => useNoteCommands(opciones()));

        await act(async () => {
            await result.current.run('//chaos off', NOTE_ID);
        });

        expect(getSystemState().effectsEnabled).toBe(false);
    });
});

describe('useNoteCommands - //history', () => {
    test('pide las actas y las pinta como una pila de versiones', async () => {
        historyMock.mockResolvedValue({
            versions: [
                { title: 'a', content: 'hola', editedAt: '2026-09-01T14:41:55.000Z' },
                { title: 'b', content: 'hola mundo', editedAt: '2026-09-01T14:49:03.000Z' },
            ],
            redoStack: [],
        });
        const { result } = renderHook(() => useNoteCommands(opciones()));

        await act(async () => {
            await result.current.run('//history', NOTE_ID);
        });

        expect(historyMock).toHaveBeenCalledWith(NOTE_ID);
        expect(result.current.response).toContain('v2');
        expect(result.current.response).toContain('v1');
    });

    test('una nota sin ediciones lo dice en vez de mostrar una lista vacía', async () => {
        historyMock.mockResolvedValue({ versions: [], redoStack: [] });
        const { result } = renderHook(() => useNoteCommands(opciones()));

        await act(async () => {
            await result.current.run('//history', NOTE_ID);
        });

        expect(result.current.response).toContain('SIN VERSIONES');
    });

    test('si la consulta falla, lo dice en vez de quedarse colgada', async () => {
        historyMock.mockRejectedValue(new Error('boom'));
        const { result } = renderHook(() => useNoteCommands(opciones()));

        await act(async () => {
            await result.current.run('//history', NOTE_ID);
        });

        expect(result.current.response).toContain('NO SE PUDO');
        expect(result.current.response).not.toContain('CONSULTANDO');
    });
});

describe('useNoteCommands - marca los secretos', () => {
    test('usar un comando cuenta como haberlo encontrado', async () => {
        const antes = getSystemState().secretsFound;
        const { result } = renderHook(() => useNoteCommands(opciones()));

        await act(async () => {
            await result.current.run('//sudo', NOTE_ID);
        });

        expect(getSystemState().secretsFound).toBeGreaterThan(antes);
    });
});
