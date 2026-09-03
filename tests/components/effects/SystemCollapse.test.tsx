// tests/components/effects/SystemCollapse.test.tsx
import { render, screen, act } from '@testing-library/react';
import SystemCollapse from '@/components/effects/SystemCollapse';
import { getSystemState, registerLogoClick } from '@/hooks/useSystemState';
import type { CollapseLevel } from '@/lib/system/collapseEscalation';

/**
 * El nivel llega por prop: lo calcula quien dispara el colapso, no el
 * componente. Aca se fija a mano para que los tiempos sean deterministas.
 */
const nivel = (over: Partial<CollapseLevel> = {}): CollapseLevel => ({
    rebootMs: 1000,
    intensity: 1,
    lockout: false,
    ...over,
});

const matchMediaOriginal = window.matchMedia;

function conMovimientoReducido(reduce: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: reduce && query.includes('prefers-reduced-motion'),
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        }),
    });
}

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    conMovimientoReducido(false);
});

afterEach(() => {
    act(() => {
        jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaOriginal,
    });
});

const avanzar = (ms: number) =>
    act(() => {
        jest.advanceTimersByTime(ms);
    });

/**
 * Cuánto hay que adelantar para llegar al rearranque.
 *
 * Estaba escrito como `2700` en diez sitios, y al meter las franjas de color
 * entre la nieve y el apagón todos se quedaron cortos a la vez. Un número mágico
 * repetido diez veces es diez sitios que hay que acordarse de tocar; con nombre,
 * es uno.
 */
const HASTA_REARRANQUE = 3200;

describe('SystemCollapse · no rompe nada', () => {
    // La regla que de verdad importa: el colapso es una capa ENCIMA. Debajo, la
    // app sigue viva, el editor sigue montado y el auto-guardado sigue su curso.
    test('la capa no intercepta el puntero', () => {
        const { container } = render(<SystemCollapse notesCount={12} level={nivel()} onDone={() => {}} />);

        expect(container.firstElementChild).toHaveClass('collapse-layer');
        expect(container.firstElementChild).toHaveStyle('pointer-events: none');
    });

    test('no le roba el foco a nadie', () => {
        const antes = document.createElement('textarea');
        document.body.appendChild(antes);
        antes.focus();

        render(<SystemCollapse notesCount={12} level={nivel()} onDone={() => {}} />);

        expect(document.activeElement).toBe(antes);
        antes.remove();
    });

    test('no se anuncia a un lector de pantalla', () => {
        const { container } = render(<SystemCollapse notesCount={12} level={nivel()} onDone={() => {}} />);

        expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    });
});

describe('SystemCollapse · la secuencia', () => {
    test('arranca con el corte a tinta plana', () => {
        const { container } = render(<SystemCollapse notesCount={12} level={nivel()} onDone={() => {}} />);

        expect(container.querySelector('[data-phase="cut"]')).not.toBeNull();
    });

    test('pasa a la estática', () => {
        const { container } = render(<SystemCollapse notesCount={12} level={nivel()} onDone={() => {}} />);

        avanzar(200);

        expect(container.querySelector('[data-phase="static"]')).not.toBeNull();
        expect(container.querySelector('pre.collapse-noise')).not.toBeNull();
    });

    test('la basura esta hecha de caracteres, no de pixeles', () => {
        // El ruido de pixeles es la estatica de una TELEVISION, y esta app es
        // una terminal de texto: se leia como un efecto de otra familia pegado
        // encima. Una terminal rota muestra basura en su propia rejilla.
        const { container } = render(
            <SystemCollapse notesCount={12} level={nivel()} onDone={() => {}} />
        );
        avanzar(200);

        expect(container.querySelector('canvas')).toBeNull();
        expect(container.querySelector('pre.collapse-noise')).not.toBeNull();
    });

    test('entre la nieve y el apagón salen las franjas de color', () => {
        // Es el orden real de un televisor que pierde la señal: primero ruido,
        // después la carta de ajuste, y sólo entonces se apaga. Sin ellas la
        // estática se cortaba a secas y parecía un corte de luz.
        const { container } = render(<SystemCollapse notesCount={12} level={nivel()} onDone={() => {}} />);

        avanzar(2300);

        expect(container.querySelector('.collapse-bars')).not.toBeNull();
    });

    test('y después el tubo se apaga', () => {
        const { container } = render(<SystemCollapse notesCount={12} level={nivel()} onDone={() => {}} />);

        avanzar(2800);

        expect(container.querySelector('[data-phase="dying"]')).not.toBeNull();
    });

    test('rearranca escribiendo, y cuenta tus notas de verdad', () => {
        render(<SystemCollapse notesCount={12} level={nivel()} onDone={() => {}} />);

        // En dos tramos: el primero entra en la fase de rearranque, y sólo
        // entonces se crea el intervalo que teclea. Avanzando de una sola vez,
        // el intervalo nace después de que el reloj ya se movió y no llega a
        // correr — que es justo lo que pasaría en la realidad.
        avanzar(3200);
        avanzar(1300);

        expect(screen.getByText(/REINICIANDO/)).toBeInTheDocument();
        expect(screen.getByText(/12 RECUPERADAS/)).toBeInTheDocument();
    });

    test('el rearranque lleva barra de progreso', () => {
        // Sin ella, medio minuto de pantalla negra se lee como que la app se
        // colgo. Con ella, se lee como que esta trabajando.
        const { container } = render(
            <SystemCollapse
                notesCount={12}
                level={nivel({ rebootMs: 20_000 })}
                onDone={() => {}}
            />
        );

        avanzar(HASTA_REARRANQUE);
        avanzar(200);

        expect(container.querySelector('.collapse-progress')?.textContent).toMatch(
            /[▮▯]{24}/
        );
        expect(container.querySelector('.collapse-eta')).not.toBeNull();
    });

    test('el rearranque tarda lo que diga el nivel', () => {
        const onDone = jest.fn();
        render(
            <SystemCollapse
                notesCount={12}
                level={nivel({ rebootMs: 20_000 })}
                onDone={onDone}
            />
        );

        avanzar(HASTA_REARRANQUE);
        avanzar(5000);
        expect(onDone).not.toHaveBeenCalled();

        avanzar(16_000);
        expect(onDone).toHaveBeenCalled();
    });

    test('con el bloqueo, el rearranque ARRANCA y se traba', () => {
        // Saltárselo era peor: la barra que empieza a subir y se queda clavada
        // cuenta el fallo mucho mejor que no intentarlo — primero te hace creer
        // que vuelve.
        const { container } = render(
            <SystemCollapse
                notesCount={12}
                level={nivel({ lockout: true })}
                onDone={() => {}}
            />
        );

        avanzar(HASTA_REARRANQUE);
        avanzar(400);

        const barra = container.querySelector('.collapse-progress')?.textContent ?? '';
        const llenos = [...barra].filter((c) => c === '▮').length;

        expect(llenos).toBeGreaterThan(0);
        expect(llenos).toBeLessThan(24);
    });

    test('la barra trabada nunca llega al final', () => {
        const { container } = render(
            <SystemCollapse
                notesCount={12}
                level={nivel({ lockout: true })}
                onDone={() => {}}
            />
        );

        avanzar(HASTA_REARRANQUE);
        avanzar(5000);

        expect(container.querySelector('.collapse-progress')?.textContent).not.toContain(
            '100%'
        );
    });

    test('y termina admitiendo el fallo antes de ceder el paso', () => {
        const onDone = jest.fn();
        const { container } = render(
            <SystemCollapse
                notesCount={12}
                level={nivel({ lockout: true })}
                onDone={onDone}
            />
        );

        avanzar(HASTA_REARRANQUE);
        avanzar(1700);
        expect(container.querySelector('.collapse-failed')).not.toBeNull();

        avanzar(1500);
        expect(onDone).toHaveBeenCalled();
    });

    test('sin bloqueo, la barra sí llega al final', () => {
        const onDone = jest.fn();
        const { container } = render(
            <SystemCollapse notesCount={12} level={nivel()} onDone={onDone} />
        );

        avanzar(HASTA_REARRANQUE);
        avanzar(2000);

        expect(container.querySelector('.collapse-failed')).toBeNull();
        expect(onDone).toHaveBeenCalled();
    });

    test('termina avisando', () => {
        const onDone = jest.fn();
        render(<SystemCollapse notesCount={12} level={nivel()} onDone={onDone} />);

        avanzar(HASTA_REARRANQUE);
        avanzar(2000);

        expect(onDone).toHaveBeenCalledTimes(1);
    });

    test('al terminar, el sistema vuelve a estar sano', () => {
        for (let i = 0; i < 9; i += 1) registerLogoClick();
        expect(getSystemState().integrity).toBe(0);

        render(<SystemCollapse notesCount={3} level={nivel()} onDone={() => {}} />);
        avanzar(HASTA_REARRANQUE);
        avanzar(2000);

        expect(getSystemState().integrity).toBe(100);
    });
});

describe('SystemCollapse · movimiento reducido', () => {
    test('se reduce a un corte a negro con el texto ya escrito', () => {
        conMovimientoReducido(true);
        const { container } = render(<SystemCollapse notesCount={7} level={nivel()} onDone={() => {}} />);

        expect(container.querySelector('pre.collapse-noise')).toBeNull();
        expect(screen.getByText(/7 RECUPERADAS/)).toBeInTheDocument();
    });

    test('dura mucho menos y también termina', () => {
        conMovimientoReducido(true);
        const onDone = jest.fn();
        render(<SystemCollapse notesCount={7} level={nivel()} onDone={onDone} />);

        avanzar(500);

        expect(onDone).toHaveBeenCalledTimes(1);
    });
});

describe('SystemCollapse · las líneas salen a medida que carga', () => {
    // Con las tres puestas desde el primer fotograma, la barra era decorativa:
    // ya sabías el final antes de que empezara.
    test('al empezar el rearranque no está todo escrito', () => {
        const { container } = render(
            <SystemCollapse
                notesCount={12}
                level={nivel({ rebootMs: 20_000 })}
                onDone={() => {}}
            />
        );

        avanzar(HASTA_REARRANQUE);
        avanzar(200);

        const texto = container.querySelector('.collapse-reboot-lines')?.textContent ?? '';
        expect(texto).not.toMatch(/RECUPERADAS/);
    });

    test('y el recuento de notas llega al final, no al principio', () => {
        // Que la máquina te diga que tus notas están enteras JUSTO AL FINAL,
        // después de haberte hecho esperar, es lo que hace que no dé miedo.
        const { container } = render(
            <SystemCollapse
                notesCount={12}
                level={nivel({ rebootMs: 4000 })}
                onDone={() => {}}
            />
        );

        avanzar(HASTA_REARRANQUE);
        avanzar(3900);

        expect(container.querySelector('.collapse-reboot-lines')?.textContent).toMatch(
            /12 RECUPERADAS/
        );
    });

    test('con el bloqueo, las líneas se van torciendo en vez de salir bien', () => {
        // EL PUNTO DONDE LA BARRA SE TRABA SE SORTEA a propósito, para que no
        // falle siempre en el mismo sitio. Eso hacía este test aleatorio: la
        // línea del error de paridad vive al 52 % y el tope sorteado cae entre
        // 0,52 y 0,83, así que con un sorteo bajo no llegaba a asomar y el test
        // fallaba una de cada nueve veces sin que nada estuviera roto.
        //
        // Se fija el sorteo alto: lo que este test comprueba es QUÉ líneas salen
        // con el bloqueo, no dónde se traba la barra, que tiene las suyas.
        const azar = jest.spyOn(Math, 'random').mockReturnValue(0.9);

        const { container } = render(
            <SystemCollapse
                notesCount={12}
                level={nivel({ lockout: true })}
                onDone={() => {}}
            />
        );

        avanzar(HASTA_REARRANQUE);
        avanzar(1500);

        const texto = container.querySelector('.collapse-reboot-lines')?.textContent ?? '';
        expect(texto).toMatch(/ERROR DE PARIDAD|REINTENTANDO/);
        expect(texto).not.toMatch(/MEMORIA: OK/);
        expect(texto).not.toMatch(/RECUPERADAS/);

        azar.mockRestore();
    });

    test('con movimiento reducido el texto sale entero, sin barra que mirar', () => {
        conMovimientoReducido(true);
        const { container } = render(
            <SystemCollapse notesCount={7} level={nivel()} onDone={() => {}} />
        );

        expect(container.querySelector('.collapse-reboot-lines')?.textContent).toMatch(
            /7 RECUPERADAS/
        );
    });
});
