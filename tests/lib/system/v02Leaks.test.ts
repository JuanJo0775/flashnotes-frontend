// tests/lib/system/v02Leaks.test.ts

/**
 * NINGUNA FUGA SUELTA UN COMANDO QUE NO EXISTE DONDE ESTÁS.
 *
 * Las ventanas de error del fallo cromático nombran de vez en cuando un comando
 * escondido, en lugar de quejarse del vídeo. Es la fuga que menos se parece a
 * una pista: parece que al sistema se le escapó.
 *
 * Pero la lista era **fija**, calculada una vez al cargar el módulo, y no sabía
 * de versiones. Dentro de la v0.2 soltaba comandos de la v1.0 — que ahí no
 * existen y contestan «desconocido». Una pista que no lleva a ninguna parte es
 * peor que ninguna pista: enseña que las pistas no valen.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, v02] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/v02'),
    ]);
    return { ...commands, v02 };
};

beforeEach(() => localStorage.clear());

describe('lo que sueltan las ventanas de error', () => {
    it('en la v1.0 no nombra los exclusivos de la v0.2', async () => {
        const { hiddenCommandNames } = await load();

        // `//recover` y `//todo` sólo existen en la versión vieja: nombrarlos
        // acá manda a alguien a teclear algo que va a fallar.
        expect(hiddenCommandNames()).not.toContain('//recover');
        expect(hiddenCommandNames()).not.toContain('//todo');
    });

    it('en la v0.2 no nombra los que esa versión no tiene', async () => {
        const { hiddenCommandNames, v02 } = await load();
        v02.enterV02('NIDO');

        const sueltos = hiddenCommandNames();

        for (const nombre of ['//hi', '//date_off', '//art', '//reset']) {
            expect(sueltos).not.toContain(nombre);
        }
    });

    it('en la v0.2 sí puede nombrar los suyos', async () => {
        const { hiddenCommandNames, v02 } = await load();
        v02.enterV02('NIDO');

        // La fuga tiene que seguir sirviendo para algo: si en la v0.2 se quedara
        // sin nada que soltar, sus dos comandos exclusivos dependerían sólo de
        // la basura de la papelera y del marcador de la nota vacía.
        expect(hiddenCommandNames()).toContain('//recover');
        expect(hiddenCommandNames()).toContain('//todo');
    });

    it('nunca se queda vacía en ninguna de las dos versiones', async () => {
        const { hiddenCommandNames, v02 } = await load();

        expect(hiddenCommandNames().length).toBeGreaterThan(0);
        v02.enterV02('NIDO');
        expect(hiddenCommandNames().length).toBeGreaterThan(0);
    });
});
