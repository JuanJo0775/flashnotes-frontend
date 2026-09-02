// tests/components/layout/StatusBarDiag.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import StatusBar from '@/components/layout/StatusBar';

jest.mock('@/hooks/useNetworkStatus', () => ({
    useNetworkStatus: () => ({
        isOnline: true,
        backendReachable: true,
        isFullyOperational: true,
        isChecking: false,
        lastOutageMs: null,
    }),
}));

function setup(overrides = {}) {
    const props = {
        notesCount: 3,
        isLoading: false,
        error: null,
        saveState: 'idle' as const,
        onOpenDiagnostics: jest.fn(),
        ...overrides,
    };

    return { ...render(<StatusBar {...props} />), props };
}

describe('StatusBar · atajo del panel de diagnóstico', () => {
    test('Alt+clic sobre [SYSTEM_OK] abre el panel', () => {
        const { props } = setup();

        fireEvent.click(screen.getByText('[TODO_BIEN]'), { altKey: true });

        expect(props.onOpenDiagnostics).toHaveBeenCalled();
    });

    test('un clic normal no abre nada', () => {
        const { props } = setup();

        fireEvent.click(screen.getByText('[TODO_BIEN]'));

        expect(props.onOpenDiagnostics).not.toHaveBeenCalled();
    });

    test('Ctrl+clic tampoco: en macOS es el clic secundario', () => {
        const { props } = setup();

        fireEvent.click(screen.getByText('[TODO_BIEN]'), { ctrlKey: true });

        expect(props.onOpenDiagnostics).not.toHaveBeenCalled();
    });

    test('el rótulo sigue siendo texto, no un control', () => {
        // La barra es una región viva (aria-live). Meter un objetivo enfocable
        // dentro la vuelve incómoda con lector de pantalla, y el panel ya tiene
        // su vía accesible por comando (>diag).
        setup();

        const rotulo = screen.getByText('[TODO_BIEN]');

        expect(rotulo).not.toHaveAttribute('role', 'button');
        expect(rotulo).not.toHaveAttribute('tabindex');
    });

    test('sin el atajo conectado, el rótulo sigue funcionando', () => {
        render(
            <StatusBar notesCount={1} isLoading={false} error={null} saveState="idle" />
        );

        expect(() =>
            fireEvent.click(screen.getByText('[TODO_BIEN]'), { altKey: true })
        ).not.toThrow();
    });
});
