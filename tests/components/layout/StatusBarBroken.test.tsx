// tests/components/layout/StatusBarBroken.test.tsx
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

/**
 * El almacén del sistema vive a nivel de módulo y la avería cromática NO se
 * deshace —dura hasta recargar, y ésa es la gracia— así que cada test necesita
 * un registro de módulos limpio. RTL se importa DENTRO del mismo registro: si
 * viniera de fuera, el componente y `render` usarían dos Reacts distintos.
 */
async function load() {
    jest.resetModules();

    const [barra, system, rtl] = await Promise.all([
        import('@/components/layout/StatusBar'),
        import('@/hooks/useSystemState'),
        import('@testing-library/react'),
    ]);

    return { StatusBar: barra.default, system, ...rtl };
}

/** La ruta de verdad: insistir con el botón de tema hasta romper la señal. */
function romper(system: {
    registerThemeToggle: () => boolean;
    THEME_BREAK_AT: number;
}) {
    for (let i = 0; i < system.THEME_BREAK_AT; i += 1) system.registerThemeToggle();
}

beforeEach(() => {
    localStorage.clear();
});

describe('StatusBar · el rótulo se da vuelta con la señal rota', () => {
    // Doce piezas del lore insisten en que todo va bien. Que este rótulo diga lo
    // contrario, la primera vez, se lee como una confesión.
    test('con la señal sana dice que todo va bien', async () => {
        const { StatusBar, render, screen, cleanup } = await load();

        render(
            <StatusBar
                notesCount={0}
                isLoading={false}
                error={null}
                saveState="idle"
            />
        );

        expect(screen.getByText(/TODO_BIEN|SYSTEM_OK/)).toBeInTheDocument();
        cleanup();
    });

    test('con la señal rota dice que todo va mal', async () => {
        const { StatusBar, system, render, screen, act, cleanup } = await load();

        render(
            <StatusBar
                notesCount={0}
                isLoading={false}
                error={null}
                saveState="idle"
            />
        );

        act(() => romper(system));

        expect(screen.getByText(/TODO_MAL|SYSTEM_FAIL/)).toBeInTheDocument();
        cleanup();
    });

    test('y deja de decir que todo va bien', async () => {
        const { StatusBar, system, render, screen, act, cleanup } = await load();

        render(
            <StatusBar
                notesCount={0}
                isLoading={false}
                error={null}
                saveState="idle"
            />
        );

        act(() => romper(system));

        expect(screen.queryByText(/TODO_BIEN|SYSTEM_OK/)).toBeNull();
        cleanup();
    });

    test('se repinta solo, sin esperar a otro cambio', async () => {
        // La barra NO estaba suscrita al almacén del sistema. Leyéndolo con una
        // función suelta, el rótulo se habría quedado en [TODO_BIEN] hasta que
        // cualquier otra cosa provocara un repintado — o sea, casi siempre mal.
        const { StatusBar, system, render, screen, act, cleanup } = await load();

        render(
            <StatusBar
                notesCount={0}
                isLoading={false}
                error={null}
                saveState="idle"
            />
        );

        act(() => romper(system));

        // Sin volver a renderizar a mano: si no estuviera suscrita, esto falla.
        expect(screen.getByText(/TODO_MAL|SYSTEM_FAIL/)).toBeInTheDocument();
        cleanup();
    });
});
