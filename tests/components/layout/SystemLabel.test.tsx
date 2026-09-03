// tests/components/layout/SystemLabel.test.tsx
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

/** El rótulo lee del almacén de módulo: cada test arranca con uno nuevo. */
async function load(rollValue = 0.99) {
    jest.resetModules();
    jest.spyOn(Math, 'random').mockReturnValue(rollValue);

    const [{ default: SystemLabel }, store, rtl] = await Promise.all([
        import('@/components/layout/SystemLabel'),
        import('@/hooks/useSystemState'),
        import('@testing-library/react'),
    ]);

    return { SystemLabel, store, ...rtl };
}

const ROTULO = '[FLASH-NOTES v1.0]';
const INVERTIDO = ']0.1v SETON-HSALF[';

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    jest.useFakeTimers();
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
});

describe('SystemLabel · arranque normal', () => {
    test('casi siempre arranca bien', async () => {
        // El rótulo está dos veces a propósito: el visible y el que lee el
        // lector de pantalla. Acá interesa el visible.
        const { SystemLabel, render, screen } = await load(0.99);

        render(<SystemLabel onCollapse={() => {}} />);

        expect(
            screen.getByText(ROTULO, { selector: '[aria-hidden="true"]' })
        ).toBeInTheDocument();
    });

    test('el nombre de la app siempre está para el lector de pantalla', async () => {
        const { SystemLabel, render, screen } = await load(0);

        render(<SystemLabel onCollapse={() => {}} />);

        expect(screen.getByText(ROTULO, { selector: '.sr-only' })).toBeInTheDocument();
    });
});

describe('SystemLabel · arranque en vídeo inverso', () => {
    test('el PRIMER render siempre es el normal, aunque toque invertirlo', async () => {
        // Sin esto hay desajuste de hidratación: el servidor pinta el rótulo
        // normal y el cliente, si le toca el sorteo, pinta el invertido; React
        // tira el árbol entero y lo regenera. El sorteo va DESPUÉS de montar.
        const { SystemLabel, render, screen } = await load(0);

        render(<SystemLabel onCollapse={() => {}} />);

        expect(screen.queryByText(INVERTIDO)).not.toBeInTheDocument();
    });

    test('de vez en cuando arranca al revés', async () => {
        const { SystemLabel, render, screen, act } = await load(0);

        render(<SystemLabel onCollapse={() => {}} />);
        act(() => {
            jest.advanceTimersByTime(20);
        });

        expect(screen.getByText(INVERTIDO)).toBeInTheDocument();
    });

    test('primero se arregla el orden y después el vídeo', async () => {
        // Corregir las dos cosas a la vez daría un solo parpadeo y el efecto se
        // perdería: el fotograma intermedio es lo que lo hace legible.
        const { SystemLabel, render, screen, act } = await load(0);

        const { container } = render(<SystemLabel onCollapse={() => {}} />);
        act(() => {
            jest.advanceTimersByTime(400);
        });

        expect(screen.queryByText(INVERTIDO)).not.toBeInTheDocument();
        expect(container.querySelector('.reverse-video')).not.toBeNull();
    });

    test('termina arreglándose solo', async () => {
        const { SystemLabel, render, screen, act } = await load(0);

        const { container } = render(<SystemLabel onCollapse={() => {}} />);
        act(() => {
            jest.advanceTimersByTime(700);
        });

        expect(screen.getAllByText(ROTULO).length).toBeGreaterThan(0);
        expect(container.querySelector('.reverse-video')).toBeNull();
    });

    test('el texto corrupto no llega al árbol de accesibilidad', async () => {
        const { SystemLabel, render, screen, act } = await load(0);

        render(<SystemLabel onCollapse={() => {}} />);
        act(() => {
            jest.advanceTimersByTime(20);
        });

        expect(screen.getByText(INVERTIDO).closest('[aria-hidden="true"]')).not.toBeNull();
    });
});

describe('SystemLabel · el botón secreto', () => {
    test('el tercer clic asoma la versión', async () => {
        const { SystemLabel, render, screen, fireEvent } = await load(0.99);

        render(<SystemLabel onCollapse={() => {}} />);
        const rotulo = screen.getByText(ROTULO, { selector: '[aria-hidden="true"]' });

        fireEvent.click(rotulo);
        fireEvent.click(rotulo);
        fireEvent.click(rotulo);

        expect(screen.getByText(/v1\.0\.1/)).toBeInTheDocument();
    });

    test('el quinto clic empieza a romper el sistema', async () => {
        const { SystemLabel, store, render, screen, fireEvent } = await load(0.99);

        render(<SystemLabel onCollapse={() => {}} />);
        const rotulo = screen.getByText(ROTULO, { selector: '[aria-hidden="true"]' });
        for (let i = 0; i < 5; i += 1) fireEvent.click(rotulo);

        expect(store.getSystemState().integrity).toBe(80);
    });

    test('el noveno clic pide el colapso', async () => {
        const { SystemLabel, render, screen, fireEvent } = await load(0.99);
        const onCollapse = jest.fn();

        render(<SystemLabel onCollapse={onCollapse} />);
        const rotulo = screen.getByText(ROTULO, { selector: '[aria-hidden="true"]' });
        for (let i = 0; i < 9; i += 1) fireEvent.click(rotulo);

        expect(onCollapse).toHaveBeenCalledTimes(1);
    });

    test('parar cuatro segundos devuelve el sistema a sano', async () => {
        const { SystemLabel, store, render, screen, fireEvent, act } = await load(0.99);

        render(<SystemLabel onCollapse={() => {}} />);
        const rotulo = screen.getByText(ROTULO, { selector: '[aria-hidden="true"]' });
        for (let i = 0; i < 5; i += 1) fireEvent.click(rotulo);

        act(() => {
            jest.advanceTimersByTime(4100);
        });

        expect(store.getSystemState().integrity).toBe(100);
    });

    test('no parece un botón ni se puede tabular hasta él', async () => {
        // No debe parecer un botón: es un secreto, no un control. Y la app se
        // maneja con teclado, así que meterlo en el orden de tabulación pondría
        // un destino sin sentido en el camino de todo el mundo.
        const { SystemLabel, render } = await load(0.99);

        const { container } = render(<SystemLabel onCollapse={() => {}} />);

        expect(container.querySelector('button')).toBeNull();
        expect(container.querySelector('[tabindex]')).toBeNull();
    });
});
