// tests/components/effects/SystemLockout.test.tsx
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

async function load() {
    jest.resetModules();
    const [{ default: SystemLockout }, store, puzzle, rtl] = await Promise.all([
        import('@/components/effects/SystemLockout'),
        import('@/hooks/useSystemState'),
        import('@/lib/system/lockoutPuzzle'),
        import('@testing-library/react'),
    ]);
    return { SystemLockout, store, puzzle, ...rtl };
}

/** Lleva el sistema hasta el bloqueo. */
function bloquear(store: { registerCollapse: () => unknown; LOCKOUT_AT: number }) {
    for (let i = 0; i < store.LOCKOUT_AT; i += 1) store.registerCollapse();
}

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('SystemLockout · la pantalla', () => {
    test('muestra el fallo y su volcado', async () => {
        const { SystemLockout, render, screen } = await load();

        render(<SystemLockout />);

        expect(screen.getByText(/NO PUDO REINICIARSE/)).toBeInTheDocument();
        expect(screen.getAllByRole('button').length).toBeGreaterThan(20);
    });

    test('NO anuncia que se levanta solo, aunque se levante', async () => {
        // La salida por tiempo existe para que nadie quede encerrado de verdad,
        // pero decirla convierte el puzzle en opcional y el estado en una cuenta
        // atrás. Que exista y no se sepa es lo que mantiene la tensión sin crear
        // una trampa.
        const { SystemLockout, render } = await load();

        const { container: c } = render(<SystemLockout />);

        expect(c.textContent).not.toMatch(/RESTABLECE|ESPERAR|MINUTOS/i);
    });

    test('pero el sistema SÍ se levanta solo a los cinco minutos', async () => {
        const { SystemLockout, store, render } = await load();
        bloquear(store);
        render(<SystemLockout />);

        jest.advanceTimersByTime(store.LOCKOUT_MS + 1000);

        expect(store.getSystemState().lockedOut).toBe(false);
    });

    test('lleva la cuenta de los intentos fallidos', async () => {
        // ⚠ SE MIRA EL CONTADOR, NO EL TEXTO «01».
        //
        // `getByText('01')` fallaba una de cada dos veces, y no porque nada
        // estuviera roto: el volcado son bytes en hexadecimal, así que `01`
        // puede salir TAMBIÉN como una celda del patrón — y entonces hay dos
        // elementos con ese texto. Es un test aleatorio por construcción, justo
        // lo que prohíbe REGLAS · D1.
        const { SystemLockout, store, render, screen, fireEvent } = await load();
        bloquear(store);

        render(<SystemLockout />);

        // Una celda cuyo byte se repite: la rota es la única que no se repite,
        // así que ésta seguro que es incorrecta.
        const celdas = screen.getAllByRole('button');
        const cuenta = new Map<string, number>();
        for (const c of celdas) {
            const t = c.textContent ?? '';
            cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
        }
        fireEvent.click(celdas.find((c) => (cuenta.get(c.textContent ?? '') ?? 0) > 1)!);

        // La clase `.lockout-tries` está en dos filas —es de estilo, no un
        // identificador— así que se apunta al contador por su testid.
        expect(screen.getByTestId('lockout-tries')).toHaveTextContent('01');
    });

    test('el volcado no cambia entre renders', async () => {
        // Si se regenerara, el byte roto saltaría de sitio mientras lo buscás.
        const { SystemLockout, render } = await load();

        const { container, rerender } = render(<SystemLockout />);
        const antes = container.textContent;
        rerender(<SystemLockout />);

        expect(container.textContent).toBe(antes);
    });
});

describe('SystemLockout · resolverlo', () => {
    test('acertar la celda rota levanta el bloqueo', async () => {
        const { SystemLockout, store, render, fireEvent, screen } = await load();
        bloquear(store);
        expect(store.getSystemState().lockedOut).toBe(true);

        render(<SystemLockout />);
        // La celda rota es la única que no encaja en el patrón que se repite.
        const celdas = screen.getAllByRole('button');
        const textos = celdas.map((c) => c.textContent ?? '');
        const cuenta = new Map<string, number>();
        for (const t of textos) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
        const rara = celdas.find((c) => cuenta.get(c.textContent ?? '') === 1)!;

        fireEvent.click(rara);

        expect(store.getSystemState().lockedOut).toBe(false);
    });

    test('errar no lo levanta, y lo dice', async () => {
        const { SystemLockout, store, render, fireEvent, screen } = await load();
        bloquear(store);

        render(<SystemLockout />);
        const celdas = screen.getAllByRole('button');
        const textos = celdas.map((c) => c.textContent ?? '');
        const cuenta = new Map<string, number>();
        for (const t of textos) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
        const comun = celdas.find((c) => (cuenta.get(c.textContent ?? '') ?? 0) > 1)!;

        fireEvent.click(comun);

        expect(store.getSystemState().lockedOut).toBe(true);
        expect(screen.getByText(/ESA NO/)).toBeInTheDocument();
    });
});

describe('SystemLockout · no roba el teclado', () => {
    test('no enfoca nada al aparecer', async () => {
        // El editor sigue montado debajo: lo que teclees tiene que seguir
        // llegando y guardándose. La pantalla está tapada; el trabajo, no.
        const antes = document.createElement('textarea');
        document.body.appendChild(antes);
        antes.focus();

        const { SystemLockout, render } = await load();
        render(<SystemLockout />);

        expect(document.activeElement).toBe(antes);
        antes.remove();
    });

    test('no es un <dialog>: no atrapa el foco ni se lleva el Escape', async () => {
        const { SystemLockout, render } = await load();

        const { container } = render(<SystemLockout />);

        expect(container.querySelector('dialog')).toBeNull();
    });
});

describe('SystemLockout · errar rehace el puzzle', () => {
    /** La celda que rompe el patrón: la única que no se repite. */
    function celdaRara(celdas: HTMLElement[]): HTMLElement {
        const cuenta = new Map<string, number>();
        for (const c of celdas) {
            const t = c.textContent ?? '';
            cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
        }
        return celdas.find((c) => cuenta.get(c.textContent ?? '') === 1)!;
    }

    test('al errar, el volcado cambia entero', async () => {
        // Sin esto, errar sólo tacharía una celda y el puzzle se resolvería por
        // descarte: sesenta clics y listo.
        const { SystemLockout, store, render, fireEvent, screen } = await load();
        bloquear(store);

        const { container } = render(<SystemLockout />);
        const antes = container.querySelector('.lockout-dump')!.textContent;

        const celdas = screen.getAllByRole('button');
        const rara = celdaRara(celdas);
        const otra = celdas.find((c) => c !== rara)!;
        fireEvent.click(otra);

        expect(container.querySelector('.lockout-dump')!.textContent).not.toBe(antes);
    });

    test('el volcado nuevo sigue teniendo su celda rota, y resolverlo funciona', async () => {
        const { SystemLockout, store, render, fireEvent, screen } = await load();
        bloquear(store);

        render(<SystemLockout />);
        const primeras = screen.getAllByRole('button');
        fireEvent.click(primeras.find((c) => c !== celdaRara(primeras))!);

        // Ahora, sobre el volcado NUEVO, se acierta.
        fireEvent.click(celdaRara(screen.getAllByRole('button')));

        expect(store.getSystemState().lockedOut).toBe(false);
    });

    test('el volcado no cambia con sólo volver a pintar', async () => {
        // Si saltara de sitio en cada render sería tramposo, no difícil.
        const { SystemLockout, render } = await load();

        const { container, rerender } = render(<SystemLockout />);
        const antes = container.querySelector('.lockout-dump')!.textContent;
        rerender(<SystemLockout />);

        expect(container.querySelector('.lockout-dump')!.textContent).toBe(antes);
    });
});
