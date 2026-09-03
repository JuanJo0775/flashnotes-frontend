// tests/hooks/useThemeVolatile.test.ts
export {};

async function fresh() {
    jest.resetModules();
    return import('@/hooks/useTheme');
}

beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
});

describe('flipThemeVolatile - el tema se sacude sin recordarlo', () => {
    test('invierte el tema visible', async () => {
        const { setTheme, flipThemeVolatile } = await fresh();

        setTheme('light');
        flipThemeVolatile();

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('NO pisa la elección guardada', async () => {
        // La avería es visual. Que te rompa la preferencia de tema sería una
        // consecuencia real de un chiste, y eso no.
        const { setTheme, flipThemeVolatile, THEME_STORAGE_KEY } = await fresh();

        setTheme('light');
        flipThemeVolatile();

        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });

    test('recargar devuelve el tema que vos elegiste', async () => {
        const primera = await fresh();
        primera.setTheme('dark');
        primera.flipThemeVolatile();
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        const segunda = await fresh();

        expect(segunda.getTheme()).toBe('dark');
    });

    test('avisa a quien esté suscrito', async () => {
        const { setTheme, flipThemeVolatile, subscribeTheme } = await fresh();
        setTheme('light');
        const escucha = jest.fn();

        const baja = subscribeTheme(escucha);
        flipThemeVolatile();
        baja();

        expect(escucha).toHaveBeenCalled();
    });

    test('sacudirlo dos veces lo deja donde estaba', async () => {
        const { setTheme, flipThemeVolatile, getTheme } = await fresh();

        setTheme('light');
        flipThemeVolatile();
        flipThemeVolatile();

        expect(getTheme()).toBe('light');
    });
});
