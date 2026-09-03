import { LANG_STORAGE_KEY, LANG_BOOT_SCRIPT, DEFAULT_LANG, isLang } from '@/config/lang';

/**
 * El almacén de idioma tiene estado de módulo (caché + suscriptores), igual que
 * el del tema. Cada test lo estrena con `jest.resetModules()` y un import
 * dinámico: importarlo arriba una sola vez haría que la caché del primer test
 * contaminara a los demás.
 */
async function freshStore() {
    jest.resetModules();
    return import('@/i18n');
}

/** jsdom no deja escribir navigator.language directamente. */
function mockBrowserLanguage(value: string | undefined) {
    Object.defineProperty(window.navigator, 'language', {
        value,
        configurable: true,
    });
}

describe('config/lang', () => {
    test('isLang sólo acepta los dos idiomas reales', () => {
        expect(isLang('es')).toBe(true);
        expect(isLang('en')).toBe(true);
        expect(isLang('fr')).toBe(false);
        expect(isLang('')).toBe(false);
        expect(isLang(null)).toBe(false);
    });

    test('el script de arranque lleva la clave real, no una referencia', () => {
        // Si `layout.tsx` importara la clave de un módulo 'use client', acá
        // saldría `getItem(undefined)`. Es el fallo que documenta config/theme.
        expect(LANG_BOOT_SCRIPT).toContain(JSON.stringify(LANG_STORAGE_KEY));
        expect(LANG_BOOT_SCRIPT).not.toContain('undefined');
    });

    test('el script de arranque estampa el idioma en <html lang>', () => {
        expect(LANG_BOOT_SCRIPT).toContain('lang');
    });
});

describe('resolución del idioma al arrancar', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('lang');
        mockBrowserLanguage('es-AR');
    });

    test('sin nada guardado sigue al navegador', async () => {
        mockBrowserLanguage('en-US');
        const { getLang } = await freshStore();

        expect(getLang()).toBe('en');
    });

    test('reconoce la región: es-AR, es-ES y es a secas son español', async () => {
        for (const tag of ['es-AR', 'es-ES', 'es']) {
            mockBrowserLanguage(tag);
            const { getLang } = await freshStore();
            expect(getLang()).toBe('es');
        }
    });

    test('un idioma que no hablamos cae en el por defecto', async () => {
        mockBrowserLanguage('fr-FR');
        const { getLang } = await freshStore();

        expect(getLang()).toBe(DEFAULT_LANG);
    });

    test('sin navigator.language cae en el por defecto sin reventar', async () => {
        mockBrowserLanguage(undefined);
        const { getLang } = await freshStore();

        expect(getLang()).toBe(DEFAULT_LANG);
    });

    test('la elección guardada gana sobre la del navegador', async () => {
        mockBrowserLanguage('en-US');
        localStorage.setItem(LANG_STORAGE_KEY, 'es');
        const { getLang } = await freshStore();

        expect(getLang()).toBe('es');
    });

    test('un valor guardado corrupto se ignora', async () => {
        mockBrowserLanguage('en-US');
        localStorage.setItem(LANG_STORAGE_KEY, 'klingon');
        const { getLang } = await freshStore();

        expect(getLang()).toBe('en');
    });
});

describe('setLang', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('lang');
        mockBrowserLanguage('es-AR');
    });

    test('cambia el idioma, lo recuerda y lo estampa en <html>', async () => {
        const { setLang, getLang } = await freshStore();

        setLang('en');

        expect(getLang()).toBe('en');
        expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
        expect(document.documentElement.getAttribute('lang')).toBe('en');
    });

    test('toggleLang alterna entre los dos', async () => {
        const { toggleLang, getLang } = await freshStore();

        expect(getLang()).toBe('es');
        toggleLang();
        expect(getLang()).toBe('en');
        toggleLang();
        expect(getLang()).toBe('es');
    });

    test('avisa a los suscriptos', async () => {
        const { setLang, subscribeToLang } = await freshStore();
        const listener = jest.fn();

        const unsubscribe = subscribeToLang(listener);
        setLang('en');

        expect(listener).toHaveBeenCalled();
        unsubscribe();
    });

    test('con el almacenamiento bloqueado el idioma igual cambia', async () => {
        // Ventana privada: setItem lanza. El idioma tiene que durar lo que la
        // pestaña en vez de romper la app.
        const setItem = jest
            .spyOn(Storage.prototype, 'setItem')
            .mockImplementation(() => {
                throw new Error('bloqueado');
            });

        const { setLang, getLang } = await freshStore();

        expect(() => setLang('en')).not.toThrow();
        expect(getLang()).toBe('en');

        setItem.mockRestore();
    });
});
