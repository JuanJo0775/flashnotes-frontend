import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NoteEditor from '@/components/notes/NoteEditor';
import type { Note } from '@/types/note.types';

// Mismo motivo que en NoteEditor.test.tsx: sin esto el editor intenta hablar de
// verdad con localhost:5000 y deja temporizadores vivos al terminar la suite.
jest.mock('@/hooks/useNetworkStatus', () => ({
    useNetworkStatus: () => ({
        isOnline: true,
        backendReachable: true,
        isFullyOperational: true,
        isChecking: false,
        lastOutageMs: null,
    }),
}));

const baseNote: Note = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Nota de prueba',
    content: 'Contenido',
    versions: [],
    redoStack: [],
};

function setup(overrides: Partial<React.ComponentProps<typeof NoteEditor>> = {}) {
    const props = {
        note: baseNote,
        onSave: jest.fn().mockResolvedValue(baseNote),
        onBack: jest.fn(),
        onUndo: jest.fn().mockResolvedValue(baseNote),
        onRedo: jest.fn().mockResolvedValue(baseNote),
        onMoveToTrash: jest.fn().mockResolvedValue(true),
        onSaveStateChange: jest.fn(),
        ...overrides,
    };

    return { ...render(<NoteEditor {...props} />), props };
}

function pressEscape() {
    fireEvent.keyDown(window, { key: 'Escape', bubbles: true, cancelable: true });
}

describe('NoteEditor · Escape', () => {
    test('Escape vuelve a la lista', async () => {
        const { props } = setup();

        pressEscape();

        await waitFor(() => expect(props.onBack).toHaveBeenCalledTimes(1));
    });

    test('Escape guarda lo pendiente ANTES de volver', async () => {
        // El editor autoguarda a los 2,5 s. Escape no espera ese plazo: fuerza
        // el guardado y recién entonces vuelve, para que la lista se recargue
        // con el contenido nuevo y no con el anterior.
        const onSave = jest.fn().mockResolvedValue(baseNote);
        const onBack = jest.fn();
        setup({ onSave, onBack });

        const textarea = screen.getByRole('textbox', { name: /contenido/i });
        fireEvent.change(textarea, { target: { value: 'Algo recién escrito' } });

        pressEscape();

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave.mock.calls[0][1]).toMatchObject({
            content: 'Algo recién escrito',
        });

        await waitFor(() => expect(onBack).toHaveBeenCalled());
    });

    test('sin cambios no guarda, pero igual vuelve', async () => {
        const onSave = jest.fn().mockResolvedValue(baseNote);
        const { props } = setup({ onSave });

        pressEscape();

        await waitFor(() => expect(props.onBack).toHaveBeenCalled());
        expect(onSave).not.toHaveBeenCalled();
    });

    test('con el diálogo de papelera abierto, Escape no sale del editor', async () => {
        // El <dialog> nativo ya cierra con Escape. Si el editor también actuara,
        // una sola pulsación cerraría el diálogo Y abandonaría la nota.
        const { props } = setup();

        fireEvent.click(screen.getByRole('button', { name: /papelera/i }));
        expect(screen.getByRole('dialog')).toHaveAttribute('open');

        pressEscape();

        expect(props.onBack).not.toHaveBeenCalled();
    });
});
