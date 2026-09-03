import { render, screen, fireEvent, within } from '@testing-library/react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

/**
 * El orden de los botones estaba invertido respecto al resto de la app: en la
 * papelera se lee "Restaurar · Eliminar" y en el editor "Undo · Redo · Papelera"
 * —la acción de más peso al final— pero este diálogo ponía confirmar primero.
 *
 * Estos tests fijan la convención para que no vuelva a divergir.
 */

function abrir(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
        <ConfirmDialog
            open
            title="⚠ Título"
            message="Mensaje"
            confirmLabel="[✓] Confirmar"
            onConfirm={onConfirm}
            onCancel={onCancel}
            {...props}
        />
    );

    return { onConfirm, onCancel };
}

/** Etiquetas de los botones, en el orden en que aparecen en el DOM. */
function ordenDeBotones() {
    const acciones = document.querySelector('.dialog-actions') as HTMLElement;
    return within(acciones)
        .getAllByRole('button')
        .map((b) => b.textContent?.trim() ?? '');
}

describe('ConfirmDialog · orden de los botones', () => {
    test('cancelar va primero y confirmar después', () => {
        abrir();

        expect(ordenDeBotones()).toEqual(['[✗] Cancelar', '[✓] Confirmar']);
    });

    test('el mismo orden cuando la acción es destructiva', () => {
        abrir({ danger: true, confirmLabel: '[X] Eliminar' });

        expect(ordenDeBotones()).toEqual(['[✗] Cancelar', '[X] Eliminar']);
    });
});

describe('ConfirmDialog · foco inicial', () => {
    test('una acción reversible enfoca confirmar', () => {
        abrir();

        expect(screen.getByRole('button', { name: /confirmar/i })).toHaveFocus();
    });

    test('una acción irreversible enfoca cancelar', () => {
        // Pulsar Enter sin leer no debe borrar nada para siempre.
        abrir({ danger: true, confirmLabel: '[X] Eliminar' });

        expect(screen.getByRole('button', { name: /cancelar/i })).toHaveFocus();
    });
});

describe('ConfirmDialog · comportamiento', () => {
    test('cada botón llama a su callback', () => {
        const { onConfirm, onCancel } = abrir();

        fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
        expect(onConfirm).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('mientras procesa, ninguno de los dos responde', () => {
        const { onConfirm, onCancel } = abrir({ busy: true });

        const botones = within(
            document.querySelector('.dialog-actions') as HTMLElement
        ).getAllByRole('button');

        botones.forEach((b) => expect(b).toBeDisabled());

        botones.forEach((b) => fireEvent.click(b));
        expect(onConfirm).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
    });

    test('Escape cancela, no confirma', () => {
        const { onConfirm, onCancel } = abrir({ danger: true });

        fireEvent(
            screen.getByRole('dialog'),
            new Event('cancel', { bubbles: false, cancelable: true })
        );

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
