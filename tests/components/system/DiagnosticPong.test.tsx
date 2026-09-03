// tests/components/system/DiagnosticPong.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import DiagnosticPanel from '@/components/system/DiagnosticPanel';
import { recordRally, clearScores } from '@/lib/system/pongScores';

/**
 * El panel es un `<dialog>` y jsdom no implementa `showModal`, así que se
 * apuntala igual que en el resto de pruebas del panel.
 */
beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {
        this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
        this.open = false;
    };
});

beforeEach(() => {
    localStorage.clear();
    clearScores();
});

/**
 * Los marcadores se leen en un efecto y no al pintar —si se leyeran al pintar,
 * el servidor diría SIN DATOS y el cliente otra cosa, y React tiraría el árbol
 * entero— así que hay que esperar a que el efecto corra.
 */
const marcador = (testId: string) =>
    waitFor(() => screen.getByTestId(testId).textContent ?? '');

const abre = () =>
    render(
        <DiagnosticPanel
            open
            onClose={jest.fn()}
            notesCount={0}
            bytesWritten={0}
            charsPerMinute={0}
        />
    );

describe('DiagnosticPanel · los marcadores del vsync-test', () => {
    // Aquí es donde se ven, y por eso el panel gana una razón para reabrirlo.
    test('sin haber jugado, lo dice en vez de mostrar un cero', async () => {
        abre();

        await expect(marcador('diag-pong-clean')).resolves.toMatch(
            /SIN DATOS|NO DATA/i
        );
    });

    test('con una partida jugada, muestra el mejor peloteo', async () => {
        recordRally('clean', 42);
        abre();

        await waitFor(() =>
            expect(screen.getByTestId('diag-pong-clean')).toHaveTextContent('42')
        );
    });

    test('cuenta las partidas jugadas', async () => {
        recordRally('clean', 42);
        recordRally('clean', 7);
        abre();

        await waitFor(() =>
            expect(screen.getByTestId('diag-pong-clean')).toHaveTextContent('2')
        );
    });

    test('el tablero degradado se muestra aparte', async () => {
        recordRally('degraded', 9);
        abre();

        await waitFor(() =>
            expect(screen.getByTestId('diag-pong-degraded')).toHaveTextContent('9')
        );
    });

    test('un tablero no contamina al otro', async () => {
        recordRally('clean', 42);
        abre();

        await waitFor(() =>
            expect(screen.getByTestId('diag-pong-degraded')).toHaveTextContent(
                /SIN DATOS|NO DATA/i
            )
        );
    });

    test('en el PRIMER render no lee el almacenamiento', async () => {
        // Ésta es la prueba del desajuste de hidratación: el servidor no tiene
        // `localStorage`, así que el primer render del cliente tiene que pintar
        // lo mismo que pintó el servidor —«sin jugar»— y sólo después ponerse al
        // día. Leyéndolo al pintar, React tiraba el árbol entero en cada carga.
        recordRally('clean', 42);
        abre();

        expect(screen.getByTestId('diag-pong-clean')).toHaveTextContent(
            /SIN DATOS|NO DATA/i
        );

        await waitFor(() =>
            expect(screen.getByTestId('diag-pong-clean')).toHaveTextContent('42')
        );
    });

    test('las filas del panel de siempre siguen ahí', () => {
        abre();

        expect(screen.getByText(/INTEGRIDAD|INTEGRITY/i)).toBeInTheDocument();
    });
});
