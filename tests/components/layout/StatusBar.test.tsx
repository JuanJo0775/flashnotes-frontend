import { render, screen } from '@testing-library/react';
import StatusBar from '@/components/layout/StatusBar';
import { LIMITS } from '@/config/limits';

jest.mock('@/hooks/useNetworkStatus', () => ({
    useNetworkStatus: () => ({
        isOnline: true,
        backendReachable: true,
        isFullyOperational: true,
        isChecking: false,
        lastOutageMs: null,
    }),
}));

function pintar(props: Partial<React.ComponentProps<typeof StatusBar>> = {}) {
    return render(
        <StatusBar
            notesCount={3}
            isLoading={false}
            error={null}
            saveState="idle"
            {...props}
        />
    );
}

/**
 * El elemento MÁS INTERNO que contiene un texto dentro de la barra.
 *
 * Se busca el último coincidente y no el primero porque los envoltorios de
 * maquetado (el hueco de ancho reservado del estado) también contienen el texto
 * de sus hijos: si se tomara el primero, se estaría mirando la clase del
 * contenedor en lugar de la del rótulo.
 */
const trozo = (re: RegExp) =>
    [...document.querySelectorAll('.status-bar span')]
        .filter((s) => re.test(s.textContent ?? ''))
        .pop();

/** Las clases con las que la app pinta algo que requiere atención. */
const CLASES_DE_COLOR = ['text-danger', 'text-warn', 'text-ok'];

describe('StatusBar · color', () => {
    /**
     * El color sólo aparece cuando algo requiere atención. Un [SYSTEM_OK] verde
     * permanente es ruido: el estado normal se dice en el mismo color que el
     * resto del texto de la barra, sea negro o blanco según el tema.
     */
    test('[SYSTEM_OK] no lleva clase de color', () => {
        pintar();

        const clases = trozo(/TODO_BIEN/)?.className ?? '';
        for (const color of CLASES_DE_COLOR) expect(clases).not.toContain(color);
    });

    test('[GUARDADO] tampoco', () => {
        pintar({ saveState: 'saved' });

        const clases = trozo(/GUARDADO\]/)?.className ?? '';
        for (const color of CLASES_DE_COLOR) expect(clases).not.toContain(color);
    });

    test('los problemas sí se pintan', () => {
        pintar({ saveState: 'error', error: { key: 'error.UNKNOWN' } });

        expect(trozo(/NO_GUARDADO/)?.className).toContain('text-danger');
        expect(trozo(/^\[ERROR\]$/)?.className).toContain('text-danger');
    });
});

describe('StatusBar · medidor', () => {
    /**
     * Regresión: el medidor dividía el número de notas entre HISTORY_MAX (20),
     * que son las versiones de deshacer POR NOTA. A las 20 notas marcaba 100% y
     * no medía nada. No hay ningún límite de cantidad de notas por sesión; el
     * único tope que un usuario puede alcanzar es CONTENT_MAX por nota.
     */
    test('sin nota abierta no se muestra', () => {
        pintar({ notesCount: 25 });

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(screen.getByText(/ARCHIVOS: 25/)).toBeInTheDocument();
    });

    test('mide la nota abierta contra el tope de contenido', () => {
        pintar({ openNoteLength: LIMITS.CONTENT_MAX / 2 });

        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    });

    test('la cantidad de notas no afecta al medidor', () => {
        pintar({ notesCount: 500, openNoteLength: 0 });

        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    test('se acota al 100% aunque el contenido se pase', () => {
        pintar({ openNoteLength: LIMITS.CONTENT_MAX * 3 });

        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    test('abrevia las cifras largas', () => {
        pintar({ openNoteLength: 1500 });

        expect(screen.getByText('[NOTA 1.5k/10k]')).toBeInTheDocument();
    });
});
