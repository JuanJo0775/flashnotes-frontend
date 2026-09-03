// tests/components/notes/NoteEditorCommands.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import NoteEditor from '@/components/notes/NoteEditor';
import type { Note } from '@/types/note.types';

jest.mock('@/hooks/useNetworkStatus', () => ({
    useNetworkStatus: () => ({
        isOnline: true,
        backendReachable: true,
        isFullyOperational: true,
        isChecking: false,
        lastOutageMs: null,
    }),
}));

jest.mock('@/lib/api/notes.api', () => ({
    notesApi: { history: jest.fn().mockResolvedValue({ versions: [], redoStack: [] }) },
}));

/** Una nota vacía: es donde viven los comandos. */
const emptyNote: Note = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Sin_titulo.txt',
    content: '',
    versions: [],
    redoStack: [],
};

function setup(overrides: Partial<React.ComponentProps<typeof NoteEditor>> = {}) {
    const props = {
        note: emptyNote,
        onSave: jest.fn().mockResolvedValue(emptyNote),
        onBack: jest.fn(),
        onUndo: jest.fn().mockResolvedValue(emptyNote),
        onRedo: jest.fn().mockResolvedValue(emptyNote),
        onMoveToTrash: jest.fn().mockResolvedValue(true),
        onSaveStateChange: jest.fn(),
        notes: [{ title: 'Ideas.txt', chars: 120 }],
        onOpenDiagnostics: jest.fn(),
        onCollapse: jest.fn(),
        ...overrides,
    };

    return { ...render(<NoteEditor {...props} />), props };
}

const textarea = () => screen.getByRole('textbox', { name: /contenido/i });

function type(value: string) {
    fireEvent.change(textarea(), { target: { value } });
}

function pressEnter() {
    return fireEvent.keyDown(textarea(), { key: 'Enter', code: 'Enter' });
}

/**
 * Ejecuta y deja que la respuesta termine de teclearse.
 *
 * La respuesta se escribe carácter a carácter con el motor de BootPrompt, así
 * que sin adelantar el reloj el texto todavía está a medias en el DOM. Se
 * adelanta lo justo para que esté completa y antes de que empiece a borrarse.
 */
async function runCommand(command: string) {
    type(command);
    await act(async () => {
        pressEnter();
    });
    await act(async () => {
        await jest.advanceTimersByTimeAsync(900);
    });
}

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
});

afterEach(() => {
    act(() => {
        jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
});

describe('NoteEditor · comandos', () => {
    test('Enter sobre un comando lo ejecuta y muestra la respuesta', async () => {
        setup();

        await runCommand('//version');

        expect(screen.getByText(/FLASH-NOTES v1\.0/)).toBeInTheDocument();
    });

    test('Enter sobre un comando no inserta un salto de línea', async () => {
        setup();

        type('//version');
        const manejado = pressEnter();
        await act(async () => {});

        // fireEvent devuelve false cuando el manejador llamó a preventDefault.
        expect(manejado).toBe(false);
    });

    test('el prefijo viejo ya no intercepta nada', () => {
        // El editor ya dibuja un `>` por línea: con el prefijo viejo, escribir
        // `>version` se veía `> >version` y parecía un error de la app.
        setup();

        type('>version');

        expect(pressEnter()).toBe(true);
    });

    test('Enter sobre texto normal no se toca', () => {
        setup();

        type('esto es una nota de verdad');

        expect(pressEnter()).toBe(true);
    });

    test('Enter con Shift nunca ejecuta, aunque parezca un comando', () => {
        setup();

        type('//version');

        expect(
            fireEvent.keyDown(textarea(), { key: 'Enter', shiftKey: true })
        ).toBe(true);
    });

    test('un comando desconocido responde y no rompe nada', async () => {
        setup();

        await runCommand('//naoperandi');

        expect(screen.getByText(/DESCONOCIDO/)).toBeInTheDocument();
    });
});

describe('NoteEditor · el comando no se guarda', () => {
    // La promesa del diseño: ni el comando ni su respuesta llegan a la base de
    // datos. Con el auto-guardado a 2,5 s, escribir `//help` y tardar tres
    // segundos en pulsar Enter bastaba para que `//help` quedara guardado y
    // consumiera un punto de historial. Esta es LA prueba de esta pieza.
    test('escribir un comando no programa el auto-guardado', () => {
        const { props } = setup();

        type('//help');
        act(() => {
            jest.advanceTimersByTime(10_000);
        });

        expect(props.onSave).not.toHaveBeenCalled();
    });

    test('ejecutarlo tampoco guarda nada', async () => {
        const { props } = setup();

        type('//version');
        await act(async () => {
            pressEnter();
        });
        act(() => {
            jest.advanceTimersByTime(10_000);
        });

        expect(props.onSave).not.toHaveBeenCalled();
    });

    test('una nota de verdad sí se sigue guardando', () => {
        const { props } = setup();

        type('esto es una nota de verdad');
        act(() => {
            jest.advanceTimersByTime(3000);
        });

        expect(props.onSave).toHaveBeenCalled();
    });

    test('un texto que empieza por // pero tiene más líneas se guarda igual', () => {
        const { props } = setup();

        type('> mis ideas\n- una\n- otra');
        act(() => {
            jest.advanceTimersByTime(3000);
        });

        expect(props.onSave).toHaveBeenCalled();
    });
});

describe('NoteEditor · efectos de los comandos', () => {
    test('>diag pide abrir el panel', async () => {
        const { props } = setup();

        type('//diag');
        await act(async () => {
            pressEnter();
        });

        expect(props.onOpenDiagnostics).toHaveBeenCalled();
    });

    test('>panic pide el colapso', async () => {
        const { props } = setup();

        type('//panic');
        await act(async () => {
            pressEnter();
        });

        expect(props.onCollapse).toHaveBeenCalled();
    });

    test('>clear deja la nota vacía', async () => {
        setup();

        type('//clear');
        await act(async () => {
            pressEnter();
        });

        expect(textarea()).toHaveValue('');
    });
});

describe('NoteEditor · la respuesta se retira', () => {
    test('tras ejecutar, la nota queda vacía', async () => {
        setup();

        type('//version');
        await act(async () => {
            pressEnter();
        });

        expect(textarea()).toHaveValue('');
    });

    test('escribir descarta la respuesta en el acto', async () => {
        setup();

        await runCommand('//version');
        expect(screen.getByText(/FLASH-NOTES v1\.0/)).toBeInTheDocument();

        type('hola');

        expect(screen.queryByText(/FLASH-NOTES v1\.0/)).not.toBeInTheDocument();
    });
});
