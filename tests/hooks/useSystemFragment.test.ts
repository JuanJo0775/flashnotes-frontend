// tests/hooks/useSystemFragment.test.ts

// Sin ningún import/export estático TypeScript trata el archivo como script
// global y su `fresh` chocaría con el de otros tests.
export {};

async function fresh() {
    jest.resetModules();
    return import('@/hooks/useSystemFragment');
}

beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('useSystemFragment - mostrar y retirar', () => {
    test('al empezar no hay ningún fragmento', async () => {
        const { getFragment } = await fresh();

        expect(getFragment()).toBeNull();
    });

    test('mostrar uno lo publica', async () => {
        const { showFragment, getFragment } = await fresh();

        showFragment();

        expect(getFragment()).not.toBeNull();
    });

    test('lo que dura varía, no es siempre lo mismo', async () => {
        // Con una duración fija el efecto se vuelve un pestañeo reconocible y el
        // ojo lo archiva como animación.
        const { FRAGMENT_MIN_VISIBLE_MS, FRAGMENT_MAX_VISIBLE_MS } = await fresh();

        expect(FRAGMENT_MIN_VISIBLE_MS).toBe(5000);
        expect(FRAGMENT_MAX_VISIBLE_MS).toBe(60_000);
    });

    test('el fragmento se retira solo', async () => {
        const { showFragment, getFragment, FRAGMENT_MAX_VISIBLE_MS } = await fresh();

        showFragment();
        jest.advanceTimersByTime(FRAGMENT_MAX_VISIBLE_MS + 100);

        expect(getFragment()).toBeNull();
    });

    test('nunca muestra el mismo dos veces seguidas', async () => {
        const { showFragment, getFragment, FRAGMENT_MAX_VISIBLE_MS } = await fresh();

        showFragment();
        const primero = getFragment();
        jest.advanceTimersByTime(FRAGMENT_MAX_VISIBLE_MS + 100);

        showFragment();

        expect(getFragment()).not.toBe(primero);
    });

    test('avisa a quien esté suscrito', async () => {
        const { subscribe, showFragment } = await fresh();
        const escucha = jest.fn();

        const baja = subscribe(escucha);
        showFragment();
        baja();

        expect(escucha).toHaveBeenCalled();
    });
});

describe('useSystemFragment - cuándo se calla', () => {
    test('con los efectos apagados no dice nada', async () => {
        jest.resetModules();
        const [fragment, system] = await Promise.all([
            import('@/hooks/useSystemFragment'),
            import('@/hooks/useSystemState'),
        ]);

        system.setEffectsEnabled(false);
        fragment.showFragment();

        expect(fragment.getFragment()).toBeNull();
    });

    test('mostrar dos veces seguidas no encadena dos avisos', async () => {
        const { showFragment, getFragment, FRAGMENT_MAX_VISIBLE_MS } = await fresh();

        showFragment();
        const primero = getFragment();
        showFragment();

        // El segundo aviso se ignora mientras el primero sigue en pantalla: dos
        // fragmentos pisándose se leerían como un parpadeo, no como una frase.
        expect(getFragment()).toBe(primero);

        jest.advanceTimersByTime(FRAGMENT_MAX_VISIBLE_MS + 100);
        expect(getFragment()).toBeNull();
    });
});
