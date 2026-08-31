import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NoteEditor from '@/components/notes/NoteEditor';
import type { Note } from '@/types/note.types';

// El editor consulta el estado de red; en tests se fija operativo para que no
// intente hablar de verdad con localhost:5000 (que es lo que dejaba temporizadores
// vivos después de terminar la suite: "Jest did not exit...").
jest.mock('@/hooks/useNetworkStatus', () => ({
    useNetworkStatus: () => ({
        isOnline: true,
        backendReachable: true,
        isFullyOperational: true,
        isChecking: false,
    }),
}));

const baseNote: Note = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Nota de prueba',
    content: 'Contenido',
    versions: [{ title: 'Viejo', content: 'Viejo', editedAt: '2026-01-01T00:00:00Z' }],
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

describe('NoteEditor · confirmación de papelera', () => {
    test('abre y cierra el diálogo', () => {
        setup();

        expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');

        fireEvent.click(screen.getByRole('button', { name: /papelera/i }));
        expect(screen.getByRole('dialog')).toHaveAttribute('open');

        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
        expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');
    });

    test('confirmar mueve la nota y vuelve a la lista', async () => {
        const { props } = setup();

        fireEvent.click(screen.getByRole('button', { name: /papelera/i }));
        fireEvent.click(screen.getByRole('button', { name: /\[✓\] mover/i }));

        await waitFor(() => {
            expect(props.onMoveToTrash).toHaveBeenCalledWith(baseNote._id);
            expect(props.onBack).toHaveBeenCalledTimes(1);
        });
    });
});

describe('NoteEditor · guardado', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('no reescribe el textarea con la respuesta del servidor', async () => {
        // Regresión: el editor hacía setContent(updated.content) tras cada
        // guardado. Si el usuario seguía tecleando durante el viaje de ida y
        // vuelta, sus pulsaciones se descartaban y el cursor saltaba.
        const onSave = jest
            .fn()
            .mockResolvedValue({ ...baseNote, content: 'RESPUESTA DEL SERVIDOR' });

        setup({ onSave });

        const textarea = screen.getByLabelText(/contenido de la nota/i);
        fireEvent.change(textarea, { target: { value: 'lo que escribo yo' } });

        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        expect(onSave).toHaveBeenCalled();
        expect(textarea).toHaveValue('lo que escribo yo');
    });

    test('sólo envía los campos que cambiaron', async () => {
        const { props } = setup();

        fireEvent.change(screen.getByLabelText(/contenido de la nota/i), {
            target: { value: 'nuevo contenido' },
        });

        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        expect(props.onSave).toHaveBeenCalledWith(baseNote._id, {
            content: 'nuevo contenido',
        });
    });

    test('conserva los saltos de línea y los espacios finales', async () => {
        // Regresión: el backend hacía trim() del contenido en cada PATCH y el
        // editor pisaba el textarea con lo devuelto, así que el salto de línea
        // que acababas de escribir desaparecía un segundo después.
        const { props } = setup();

        fireEvent.change(screen.getByLabelText(/contenido de la nota/i), {
            target: { value: 'linea1\nlinea2\n' },
        });

        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        expect(props.onSave).toHaveBeenCalledWith(baseNote._id, {
            content: 'linea1\nlinea2\n',
        });
    });

    test('no guarda si no hubo cambios reales', async () => {
        const { props } = setup();

        await act(async () => {
            jest.advanceTimersByTime(5000);
        });

        expect(props.onSave).not.toHaveBeenCalled();
    });

    test('informa el fallo en vez de tragárselo', async () => {
        // onSave devuelve null cuando la petición falla; antes eso sólo iba a
        // console.error y el usuario seguía escribiendo sin saber que no se
        // estaba guardando nada.
        const onSave = jest.fn().mockResolvedValue(null);
        const onSaveStateChange = jest.fn();

        setup({ onSave, onSaveStateChange });

        fireEvent.change(screen.getByLabelText(/contenido de la nota/i), {
            target: { value: 'algo' },
        });

        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        expect(onSaveStateChange).toHaveBeenCalledWith('error');
        expect(screen.getByText(/sin guardar/i)).toBeInTheDocument();
    });
});
