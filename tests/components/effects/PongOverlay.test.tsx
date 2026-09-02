// tests/components/effects/PongOverlay.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import PongOverlay from '@/components/effects/PongOverlay';
import { COURT_W, COURT_H, GLYPH } from '@/lib/system/pong';
import { readScores, clearScores, SYSTEM_RECORD } from '@/lib/system/pongScores';

/** Deja correr el bucle: `ms` de reloj falso, fotograma a fotograma. */
function corre(ms: number) {
    act(() => {
        jest.advanceTimersByTime(ms);
    });
}

/** La coordenada decimal de una pieza suelta (pelota o paleta). */
function pos(testId: string): { x: number; y: number } {
    const el = screen.getByTestId(testId);
    return {
        x: Number(el.style.getPropertyValue('--x')),
        y: Number(el.style.getPropertyValue('--y')),
    };
}

/** El campo dibujado, tal cual está en pantalla. */
function corte(): string {
    return screen.getByTestId('pong-court').textContent ?? '';
}

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    clearScores();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('PongOverlay · cuándo aparece', () => {
    test('cerrado no dibuja nada', () => {
        render(<PongOverlay open={false} onClose={jest.fn()} />);

        expect(screen.queryByTestId('pong-court')).toBeNull();
    });

    test('abierto dibuja el corte', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(screen.getByTestId('pong-court')).toBeInTheDocument();
    });

    test('el corte tiene una línea por fila', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(corte().split('\n')).toHaveLength(COURT_H);
    });

    test('cada línea mide el ancho pactado', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        for (const linea of corte().split('\n')) {
            expect(linea).toHaveLength(COURT_W);
        }
    });
});

describe('PongOverlay · salir', () => {
    test('Escape cierra', () => {
        const onClose = jest.fn();
        render(<PongOverlay open onClose={onClose} />);

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(onClose).toHaveBeenCalled();
    });

    test('cerrado, Escape ya no llama a nadie', () => {
        const onClose = jest.fn();
        render(<PongOverlay open={false} onClose={onClose} />);

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(onClose).not.toHaveBeenCalled();
    });
});

describe('PongOverlay · la pelota se mueve sola, y con fluidez', () => {
    test('la pelota avanza con el tiempo', () => {
        render(<PongOverlay open onClose={jest.fn()} />);
        const antes = pos('pong-ball');

        corre(500);

        expect(pos('pong-ball').x).not.toBeCloseTo(antes.x, 3);
    });

    test('se mueve en decimales y no de celda en celda', () => {
        // ES LA PIEZA QUE LA HACE FLUIDA. Dentro de la rejilla la pelota avanza
        // 0,3 celdas por fotograma, así que redondeando a celda sólo se movería
        // una vez cada tres: se veía a tirones aunque el bucle fuera perfecto.
        // El tirón no era retraso, era el redondeo.
        render(<PongOverlay open onClose={jest.fn()} />);
        corre(120);

        const { x } = pos('pong-ball');
        expect(x).not.toBe(Math.floor(x));
    });

    test('un fotograma suelto ya la mueve', () => {
        render(<PongOverlay open onClose={jest.fn()} />);
        const antes = pos('pong-ball');

        corre(16);

        expect(pos('pong-ball').x).not.toBe(antes.x);
    });

    test('sigue dentro del corte pasado un rato', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        corre(4000);

        const { x, y } = pos('pong-ball');
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(COURT_W);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(COURT_H);
    });

    test('el campo NO cambia: sólo se mueve lo que va encima', () => {
        render(<PongOverlay open onClose={jest.fn()} />);
        const primero = corte();

        corre(500);

        expect(corte()).toBe(primero);
    });
});

describe('PongOverlay · el barrido es el de la casa', () => {
    // La app ya tiene `.scanline-effect`, que corre en TODAS las pantallas
    // porque es el refresco del tubo, no un adorno de una vista. El juego no
    // trae uno propio: lo que hacía falta era subir el de siempre por encima de
    // las capas, no duplicarlo.
    test('el juego no dibuja un barrido propio', () => {
        const { container } = render(<PongOverlay open onClose={jest.fn()} />);

        expect(container.querySelector('.pong-scan')).toBeNull();
    });
});

describe('PongOverlay · el teclado', () => {
    test('las flechas mueven la paleta', () => {
        render(<PongOverlay open onClose={jest.fn()} />);
        const antes = pos('pong-paddle-right');

        fireEvent.keyDown(window, { key: 'ArrowUp' });
        corre(300);
        fireEvent.keyUp(window, { key: 'ArrowUp' });

        expect(pos('pong-paddle-right').y).toBeLessThan(antes.y);
    });

    test('las flechas no hacen desplazar la página', () => {
        // Sin esto, jugar movería la barra de desplazamiento debajo del juego.
        render(<PongOverlay open onClose={jest.fn()} />);

        const evento = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            cancelable: true,
            bubbles: true,
        });
        window.dispatchEvent(evento);

        expect(evento.defaultPrevented).toBe(true);
    });

    test('soltar la tecla detiene la paleta', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        fireEvent.keyDown(window, { key: 'ArrowDown' });
        corre(200);
        fireEvent.keyUp(window, { key: 'ArrowDown' });

        const quieta = pos('pong-paddle-right').y;
        corre(600);

        expect(pos('pong-paddle-right').y).toBe(quieta);
    });
});

describe('PongOverlay · los dos modos', () => {
    test('arranca en modo pared', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(corte()).toContain(GLYPH.wall);
    });

    test('ofrece los dos jugadores sin que haya que descubrirlo', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(screen.getByTestId('pong-hint')).toHaveTextContent('2');
    });

    test('pulsar 2 pasa a dos jugadores', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        fireEvent.keyDown(window, { key: '2' });

        expect(corte()).not.toContain(GLYPH.wall);
        expect(corte()).toContain(GLYPH.net);
        expect(screen.getByTestId('pong-paddle-left')).toBeInTheDocument();
    });

    test('en modo pared no hay paleta izquierda', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(screen.queryByTestId('pong-paddle-left')).toBeNull();
    });

    test('pulsar 1 vuelve al modo pared', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        fireEvent.keyDown(window, { key: '2' });
        fireEvent.keyDown(window, { key: '1' });

        expect(corte()).toContain(GLYPH.wall);
    });

    test('cambiar de modo empieza partida nueva', () => {
        render(<PongOverlay open onClose={jest.fn()} />);
        corre(3000);

        fireEvent.keyDown(window, { key: '2' });

        expect(screen.getByTestId('pong-score')).toHaveTextContent('0');
    });
});

describe('PongOverlay · el marcador en pantalla', () => {
    test('muestra el peloteo', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(screen.getByTestId('pong-score')).toBeInTheDocument();
    });

    test('enseña el récord del sistema', () => {
        // Se compara sin separadores: el número se pinta con la agrupación de
        // miles de la región del equipo —118.394 acá, 118,394 allá— igual que
        // las fechas, así que fijar el formato ataría el test a una región.
        render(<PongOverlay open onClose={jest.fn()} />);

        const soloDigitos = (
            screen.getByTestId('pong-record').textContent ?? ''
        ).replace(/\D/g, '');

        expect(soloDigitos).toBe(String(SYSTEM_RECORD));
    });
});

describe('PongOverlay · al perder', () => {
    /** Sube la paleta hasta arriba y espera a que la pelota se escape. */
    function pierde(limiteMs = 90_000) {
        fireEvent.keyDown(window, { key: 'ArrowUp' });

        for (let t = 0; t < limiteMs; t += 1000) {
            corre(1000);
            if (screen.queryByTestId('pong-over')) return true;
        }
        return false;
    }

    test('la partida termina cuando se escapa', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(pierde()).toBe(true);
    });

    test('el peloteo conseguido queda guardado', () => {
        render(<PongOverlay open onClose={jest.fn()} />);
        pierde();

        expect(readScores().clean.games).toBe(1);
    });

    test('con la señal sana guarda en el tablero limpio', () => {
        render(<PongOverlay open onClose={jest.fn()} />);
        pierde();

        expect(readScores().degraded.games).toBe(0);
    });

    test('se puede volver a empezar', () => {
        render(<PongOverlay open onClose={jest.fn()} />);
        pierde();

        fireEvent.keyDown(window, { key: 'Enter' });

        expect(screen.queryByTestId('pong-over')).toBeNull();
    });

    test('empezar de nuevo no cuenta como partida jugada', () => {
        render(<PongOverlay open onClose={jest.fn()} />);
        pierde();
        fireEvent.keyDown(window, { key: 'Enter' });

        expect(readScores().clean.games).toBe(1);
    });
});

describe('PongOverlay · accesibilidad', () => {
    test('se anuncia como lo que es', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(screen.getByRole('application')).toBeInTheDocument();
    });

    test('el dibujo no se lee carácter a carácter', () => {
        // Un lector de pantalla deletreando 1.728 caracteres de rejilla no
        // informa de nada: el corte es decorativo y el estado va en el marcador.
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(screen.getByTestId('pong-court')).toHaveAttribute(
            'aria-hidden',
            'true'
        );
    });
});

describe('PongOverlay · el cromo de la app', () => {
    // El juego no es una pantalla ajena: es la app en otro modo. Lleva la misma
    // cabecera y el mismo pie, con los conmutadores DE VERDAD.
    test('trae cabecera y pie', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(screen.getByTestId('pong-logo')).toBeInTheDocument();
        expect(screen.getByTestId('pong-status')).toBeInTheDocument();
    });

    test('el rótulo no dice FLASH-NOTES, dice de quién es la pantalla', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(screen.getByTestId('pong-logo')).toHaveTextContent(/VSYNC-TEST/);
        expect(screen.getByTestId('pong-logo')).not.toHaveTextContent(/FLASH/);
    });

    test('el conmutador de tema es el de verdad', () => {
        // Importa que sea el real: es el que rompe la señal a fuerza de
        // insistir, y romperla DESDE el juego es lo que le da sentido al
        // marcador degradado.
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(
            screen.getByRole('button', { name: /tema|theme/i })
        ).toBeInTheDocument();
    });

    test('el conmutador de idioma también', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        expect(
            screen.getByRole('button', { name: /idioma|language/i })
        ).toBeInTheDocument();
    });

    test('en vez del recuento de archivos, la velocidad', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        const pie = screen.getByTestId('pong-speed');
        expect(pie).toHaveTextContent('×1.00');
        expect(pie).not.toHaveTextContent(/ARCHIVOS|FILES/i);
    });

    test('la velocidad sube a la vista', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        corre(30_000);

        expect(screen.getByTestId('pong-speed')).not.toHaveTextContent('×1.00');
    });

    test('los modos se pueden cambiar desde la cabecera', () => {
        render(<PongOverlay open onClose={jest.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: /2 JUGADORES|2 PLAYERS/i }));

        expect(corte()).toContain(GLYPH.net);
    });
});

describe('PongOverlay · la avería no tiene excepciones', () => {
    // La regla del proyecto: durante el fallo cromático, TODO lo visible se ve
    // roto. La capa recibe la misma lista de clases que el envoltorio de la app
    // en vez de calcularla aparte, para que no puedan divergir.
    test('lleva puestas las clases de la avería que le pasan', () => {
        const { container } = render(
            <PongOverlay
                open
                onClose={jest.fn()}
                glitchClassName="chromatic-failure glitch-jolt is-severe"
            />
        );

        const capa = container.querySelector('.pong-layer')!;
        expect(capa).toHaveClass('chromatic-failure');
        expect(capa).toHaveClass('glitch-jolt');
        expect(capa).toHaveClass('is-severe');
    });

    test('sin avería no se cuela ninguna clase de más', () => {
        const { container } = render(<PongOverlay open onClose={jest.fn()} />);

        expect(container.querySelector('.pong-layer')!.className).toBe('pong-layer');
    });

    test('la amplitud del tirón también llega', () => {
        const { container } = render(
            <PongOverlay
                open
                onClose={jest.fn()}
                glitchClassName="glitch-jolt"
                glitchStyle={{ '--glitch-amp': '7px' } as React.CSSProperties}
            />
        );

        const capa = container.querySelector('.pong-layer') as HTMLElement;
        expect(capa.style.getPropertyValue('--glitch-amp')).toBe('7px');
    });
});
