import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function press(key: string, options: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
    });
    window.dispatchEvent(event);
    return event;
}

describe('useKeyboardShortcuts · Escape', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('Escape llama al manejador', () => {
        const onEscape = jest.fn();
        renderHook(() => useKeyboardShortcuts({ onEscape }));

        press('Escape');

        expect(onEscape).toHaveBeenCalledTimes(1);
    });

    test('Escape no hace nada si nadie lo pidió', () => {
        renderHook(() => useKeyboardShortcuts({ onSave: jest.fn() }));

        const event = press('Escape');

        expect(event.defaultPrevented).toBe(false);
    });

    test('con un <dialog> abierto, Escape es del diálogo', () => {
        // ConfirmDialog y DiagnosticPanel usan <dialog> nativo, que ya cierra
        // con Escape por su cuenta. Si el manejador global también actuara, un
        // solo Escape cerraría el diálogo Y saldría del editor.
        const onEscape = jest.fn();
        renderHook(() => useKeyboardShortcuts({ onEscape }));

        const dialog = document.createElement('dialog');
        dialog.setAttribute('open', '');
        document.body.appendChild(dialog);

        press('Escape');

        expect(onEscape).not.toHaveBeenCalled();
    });

    test('un <dialog> cerrado no estorba', () => {
        const onEscape = jest.fn();
        renderHook(() => useKeyboardShortcuts({ onEscape }));

        document.body.appendChild(document.createElement('dialog'));

        press('Escape');

        expect(onEscape).toHaveBeenCalledTimes(1);
    });

    test('Escape con Ctrl no cuenta', () => {
        // Ctrl+Escape abre el menú de inicio en Windows. No es nuestro.
        const onEscape = jest.fn();
        renderHook(() => useKeyboardShortcuts({ onEscape }));

        press('Escape', { ctrlKey: true });

        expect(onEscape).not.toHaveBeenCalled();
    });
});

describe('useKeyboardShortcuts · los atajos de siempre', () => {
    test('Ctrl+S guarda y evita el diálogo del navegador', () => {
        const onSave = jest.fn();
        renderHook(() => useKeyboardShortcuts({ onSave }));

        const event = press('s', { ctrlKey: true });

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(true);
    });

    test('Ctrl+Z deshace y Ctrl+Shift+Z rehace', () => {
        const onUndo = jest.fn();
        const onRedo = jest.fn();
        renderHook(() => useKeyboardShortcuts({ onUndo, onRedo }));

        press('z', { ctrlKey: true });
        expect(onUndo).toHaveBeenCalledTimes(1);

        press('z', { ctrlKey: true, shiftKey: true });
        expect(onRedo).toHaveBeenCalledTimes(1);

        press('y', { ctrlKey: true });
        expect(onRedo).toHaveBeenCalledTimes(2);
    });

    test('Ctrl+N crea una nota', () => {
        const onNewNote = jest.fn();
        renderHook(() => useKeyboardShortcuts({ onNewNote }));

        press('n', { ctrlKey: true });

        expect(onNewNote).toHaveBeenCalledTimes(1);
    });

    test('una tecla suelta no dispara nada', () => {
        const onSave = jest.fn();
        renderHook(() => useKeyboardShortcuts({ onSave }));

        press('s');

        expect(onSave).not.toHaveBeenCalled();
    });
});
