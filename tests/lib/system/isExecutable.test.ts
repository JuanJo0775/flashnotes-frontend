// tests/lib/system/isExecutable.test.ts

/**
 * QUÉ SE EJECUTA AL PULSAR ENTER, DECIDIDO EN UN SOLO SITIO.
 *
 * La pregunta `[y/n]` de `//reset` no funcionaba, y el motivo es de manual: el
 * editor consultaba `isCommandLine` POR SU CUENTA antes de llamar al motor, así
 * que una `y` suelta —que no es una línea de comando— no llegaba nunca. El motor
 * la habría entendido perfectamente; nadie se la daba.
 *
 * Cuando la misma decisión se toma en dos sitios, tarde o temprano dejan de
 * decir lo mismo. Acá se toma una vez.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, confirm] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/confirm'),
    ]);
    return { ...commands, ...confirm };
};

beforeEach(() => localStorage.clear());

describe('sin ninguna pregunta pendiente', () => {
    it('un comando se ejecuta', async () => {
        const { isExecutable } = await load();
        expect(isExecutable('//help')).toBe(true);
    });

    it('una «y» suelta NO: es texto de una nota', async () => {
        const { isExecutable } = await load();
        expect(isExecutable('y')).toBe(false);
    });

    it('ni una nota que empiece por «n»', async () => {
        const { isExecutable } = await load();
        expect(isExecutable('no me olvides de llamar')).toBe(false);
    });
});

describe('con la pregunta en el aire', () => {
    it('la «y» sí se ejecuta, y sin prefijo', async () => {
        const { isExecutable, askConfirm } = await load();
        askConfirm('reset');

        expect(isExecutable('y')).toBe(true);
        expect(isExecutable('n')).toBe(true);
        expect(isExecutable('s')).toBe(true);
    });

    it('pero cualquier otra cosa sigue siendo texto', async () => {
        // Escribir una nota mientras hay una pregunta en el aire tiene que
        // seguir siendo escribir una nota.
        const { isExecutable, askConfirm } = await load();
        askConfirm('reset');

        expect(isExecutable('yo qué sé')).toBe(false);
        expect(isExecutable('nada')).toBe(false);
    });

    it('los comandos siguen funcionando', async () => {
        const { isExecutable, askConfirm } = await load();
        askConfirm('reset');

        expect(isExecutable('//help')).toBe(true);
    });
});
