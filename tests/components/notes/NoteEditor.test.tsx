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
        lastOutageMs: null,
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

describe('NoteEditor · secuencia de arranque', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    const vacia: Note = { ...baseNote, content: '', versions: [], redoStack: [] };

    /** El texto de ayuda que se teclea solo al abrir una nota vacía. */
    const placeholder = () => document.querySelector('.editor-placeholder');

    test('una nota vacía arranca tecleando el texto de ayuda', () => {
        setup({ note: vacia });

        expect(placeholder()).toBeInTheDocument();
        // Todavía no escribió nada: el cursor de bloque está presente.
        expect(placeholder()?.querySelector('.cursor-block')).toBeInTheDocument();
    });

    test('mientras arranca se oculta el cursor real, para no tener dos', () => {
        setup({ note: vacia });

        expect(screen.getByLabelText(/contenido de la nota/i)).toHaveClass('is-booting');
    });

    test('una nota con contenido no arranca: no hay animación ni texto de ayuda', () => {
        setup();

        expect(placeholder()).not.toBeInTheDocument();
        expect(screen.getByLabelText(/contenido de la nota/i)).not.toHaveClass('is-booting');
    });

    test('escribir corta la animación y devuelve el cursor real', () => {
        setup({ note: vacia });

        fireEvent.change(screen.getByLabelText(/contenido de la nota/i), {
            target: { value: 'H' },
        });

        expect(placeholder()).not.toBeInTheDocument();
        expect(screen.getByLabelText(/contenido de la nota/i)).not.toHaveClass('is-booting');
    });

    test('al terminar, borra el texto y deja el cursor esperando', async () => {
        // El arco completo: despertar, teclear, pausa y borrado hacia atrás.
        // No desaparece: el mismo cursor que escribió el texto se queda listo.
        setup({ note: vacia });

        // La secuencia encadena `await` entre temporizador y temporizador, así
        // que hay que avanzar el reloj dejando correr las microtareas: la
        // versión síncrona sólo dispara los temporizadores ya programados y la
        // cadena se queda a medio borrar.
        await act(async () => {
            await jest.advanceTimersByTimeAsync(6000);
        });

        const p = placeholder();
        expect(p).toBeInTheDocument();
        expect(p?.textContent).toBe('');
        expect(p?.querySelector('.cursor-block')).toBeInTheDocument();
    });

    test('salir del campo también termina el arranque', () => {
        setup({ note: vacia });

        fireEvent.blur(screen.getByLabelText(/contenido de la nota/i));

        expect(placeholder()).not.toBeInTheDocument();
        expect(screen.getByLabelText(/contenido de la nota/i)).not.toHaveClass('is-booting');
    });

    test('informa al padre del tamaño de la nota, agrupado', () => {
        // Va agrupado a propósito: avisar al padre en cada tecla re-renderiza
        // la página entera y encadena una actualización más por pulsación, lo
        // que hacía que React abortara el ciclo al escribir rápido.
        const onLengthChange = jest.fn();
        setup({ onLengthChange });

        expect(onLengthChange).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(onLengthChange).toHaveBeenCalledWith(baseNote.content.length);
    });

    test('escribir rápido no dispara un aviso por tecla', () => {
        const onLengthChange = jest.fn();
        setup({ onLengthChange });

        const ta = screen.getByLabelText(/contenido de la nota/i);
        for (const texto of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
            fireEvent.change(ta, { target: { value: texto } });
        }

        act(() => {
            jest.advanceTimersByTime(300);
        });

        // Una sola vez, con el valor final: no cinco.
        expect(onLengthChange).toHaveBeenCalledTimes(1);
        expect(onLengthChange).toHaveBeenCalledWith(5);
    });
});

describe('NoteEditor · posición del cursor al abrir', () => {
    test('en una nota con contenido, el cursor va al final', () => {
        // Regresión: `focus()` a secas deja el cursor en la posición cero, así
        // que al volver a una nota ya escrita aparecías al comienzo y tenías
        // que bajar a mano hasta donde ibas.
        setup();

        const ta = screen.getByLabelText(/contenido de la nota/i) as HTMLTextAreaElement;

        expect(ta).toHaveFocus();
        expect(ta.selectionStart).toBe(baseNote.content.length);
        expect(ta.selectionEnd).toBe(baseNote.content.length);
    });

    test('en una nota vacía, el cursor queda en cero (que es el final)', () => {
        setup({ note: { ...baseNote, content: '', versions: [], redoStack: [] } });

        const ta = screen.getByLabelText(/contenido de la nota/i) as HTMLTextAreaElement;

        expect(ta).toHaveFocus();
        expect(ta.selectionStart).toBe(0);
    });

    test('un texto de varias líneas también abre al final', () => {
        const larga = 'linea 1\nlinea 2\nlinea 3\nFINAL';
        setup({ note: { ...baseNote, content: larga } });

        const ta = screen.getByLabelText(/contenido de la nota/i) as HTMLTextAreaElement;

        expect(ta.selectionStart).toBe(larga.length);
    });
});
