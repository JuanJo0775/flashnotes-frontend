// tests/components/ui/ThemeToggleGlitch.test.tsx

// Testing Library registra su limpieza con un afterEach al importarla, y acá se
// importa dentro de cada test, donde Jest no admite hooks nuevos.
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

/**
 * El interruptor lee del almacén de módulo. Se carga todo —componente, almacén
 * y Testing Library— dentro del mismo registro aislado, para que compartan la
 * misma copia de React y para que cada test arranque con la señal limpia.
 */
async function load() {
    jest.resetModules();
    const [{ default: ThemeToggle }, store, rtl] = await Promise.all([
        import('@/components/ui/ThemeToggle'),
        import('@/hooks/useSystemState'),
        import('@testing-library/react'),
    ]);
    return { ThemeToggle, store, ...rtl };
}

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
});

describe('ThemeToggle · uso normal', () => {
    test('un toque cambia el tema', async () => {
        const { ThemeToggle, render, screen, fireEvent } = await load();

        render(<ThemeToggle />);
        const antes = screen.getByRole('button').textContent;
        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByRole('button').textContent).not.toBe(antes);
    });

    test('unos pocos toques no rompen nada', async () => {
        const { ThemeToggle, store, render, screen, fireEvent } = await load();

        render(<ThemeToggle />);
        for (let i = 0; i < 3; i += 1) fireEvent.click(screen.getByRole('button'));

        expect(store.getSystemState().chromaticFailure).toBe(false);
        expect(screen.getByRole('button')).toBeEnabled();
    });
});

describe('ThemeToggle · romper la señal', () => {
    test('insistir rompe la señal', async () => {
        const { ThemeToggle, store, render, screen, fireEvent } = await load();

        render(<ThemeToggle />);
        for (let i = 0; i < store.THEME_BREAK_AT; i += 1) {
            fireEvent.click(screen.getByRole('button'));
        }

        expect(store.getSystemState().chromaticFailure).toBe(true);
    });

    test('roto, el interruptor queda inservible', async () => {
        const { ThemeToggle, store, render, screen, fireEvent } = await load();

        render(<ThemeToggle />);
        for (let i = 0; i < store.THEME_BREAK_AT; i += 1) {
            fireEvent.click(screen.getByRole('button'));
        }

        expect(screen.getByRole('button')).toBeDisabled();
    });

    test('roto, ya no cambia el tema por más que insistas', async () => {
        const { ThemeToggle, store, render, screen, fireEvent } = await load();

        render(<ThemeToggle />);
        for (let i = 0; i < store.THEME_BREAK_AT; i += 1) {
            fireEvent.click(screen.getByRole('button'));
        }

        const congelado = document.documentElement.getAttribute('data-theme');
        fireEvent.click(screen.getByRole('button'));

        expect(document.documentElement.getAttribute('data-theme')).toBe(congelado);
    });

    test('el rótulo dice que la señal se perdió', async () => {
        const { ThemeToggle, store, render, screen, fireEvent } = await load();

        render(<ThemeToggle />);
        for (let i = 0; i < store.THEME_BREAK_AT; i += 1) {
            fireEvent.click(screen.getByRole('button'));
        }

        expect(screen.getByRole('button')).toHaveTextContent('SEÑAL');
    });

    test('sigue teniendo nombre accesible cuando está roto', async () => {
        const { ThemeToggle, store, render, screen, fireEvent } = await load();

        render(<ThemeToggle />);
        for (let i = 0; i < store.THEME_BREAK_AT; i += 1) {
            fireEvent.click(screen.getByRole('button'));
        }

        expect(screen.getByRole('button')).toHaveAccessibleName(/señal/i);
    });
});
