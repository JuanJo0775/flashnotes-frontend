// tests/components/layout/StatusBarFragment.test.tsx
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

async function load() {
    jest.resetModules();

    jest.doMock('@/hooks/useNetworkStatus', () => ({
        useNetworkStatus: () => ({
            isOnline: true,
            backendReachable: true,
            isFullyOperational: true,
            isChecking: false,
            lastOutageMs: null,
        }),
        clearLastOutage: () => {},
    }));

    const [{ default: StatusBar }, fragment, rtl] = await Promise.all([
        import('@/components/layout/StatusBar'),
        import('@/hooks/useSystemFragment'),
        import('@testing-library/react'),
    ]);

    return { StatusBar, fragment, ...rtl };
}

const props = {
    notesCount: 3,
    isLoading: false,
    error: null,
    saveState: 'idle' as const,
};

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
});

describe('StatusBar · fragmentos del sistema', () => {
    test('sin fragmento dice lo de siempre', async () => {
        const { StatusBar, render, screen } = await load();

        render(<StatusBar {...props} />);

        expect(screen.getByText('[TODO_BIEN]')).toBeInTheDocument();
    });

    test('con un fragmento, el rótulo dice otra cosa', async () => {
        const { StatusBar, fragment, render, act } = await load();

        render(<StatusBar {...props} />);
        act(() => fragment.showFragment());

        // El [SYSTEM_OK] real sigue en el árbol de accesibilidad; lo que cambia
        // es lo que se VE, que es lo que este test mira.
        const visible = document.querySelector('[aria-hidden="true"] span');
        expect(visible?.textContent).toMatch(/^\[.+\]$/);
        expect(visible?.textContent).not.toBe('[TODO_BIEN]');
    });

    test('el fragmento NO se anuncia a un lector de pantalla', async () => {
        // La barra es una región viva: todo lo que cambie ahí dentro se lee en
        // voz alta. Un repertorio de frases raras cada tres minutos, para quien
        // usa lector, es una voz que le interrumpe lo que está escribiendo.
        const { StatusBar, fragment, render, act } = await load();

        render(<StatusBar {...props} />);
        act(() => fragment.showFragment());

        const oculto = document.querySelector('.status-slot [aria-hidden="true"]');
        expect(oculto).not.toBeNull();
        expect(oculto?.textContent).toMatch(/^\[.+\]$/);
    });

    test('el estado real sigue estando para el lector de pantalla', async () => {
        const { StatusBar, fragment, render, screen, act } = await load();

        render(<StatusBar {...props} />);
        act(() => fragment.showFragment());

        expect(screen.getByText('[TODO_BIEN]', { selector: '.sr-only' })).toBeInTheDocument();
    });

    test('un problema real gana siempre al fragmento', async () => {
        const { StatusBar, fragment, render, screen, act } = await load();

        render(<StatusBar {...props} error={{ key: 'error.UNKNOWN' }} />);
        act(() => fragment.showFragment());

        expect(screen.getByText('[ERROR]')).toBeInTheDocument();
    });

    test('mientras carga, tampoco se pisa la información', async () => {
        const { StatusBar, fragment, render, screen, act } = await load();

        render(<StatusBar {...props} isLoading />);
        act(() => fragment.showFragment());

        expect(screen.getByText(/CARGANDO/)).toBeInTheDocument();
    });
});

describe('StatusBar · la maqueta no se mueve', () => {
    test('el hueco del estado reserva el ancho del fragmento más largo', async () => {
        // Un fragmento más ancho que [SYSTEM_OK] empujaría [GUARDADO] de lado.
        // Se reserva por maquetado, en `ch`, que en monoespaciada es el avance
        // exacto de un carácter: no hay nada que medir en ejecución.
        const { StatusBar, render, screen } = await load();
        const { MAX_FRAGMENT_LENGTH } = await import('@/lib/system/lore');

        render(<StatusBar {...props} />);

        const hueco = screen.getByText('[TODO_BIEN]').closest('.status-slot');
        expect(hueco).not.toBeNull();
        expect(hueco).toHaveStyle(`min-width: ${MAX_FRAGMENT_LENGTH}ch`);
    });
});
