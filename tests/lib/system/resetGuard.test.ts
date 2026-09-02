// tests/lib/system/resetGuard.test.ts

/**
 * `//reset` NO BORRA A LA PRIMERA.
 *
 * Es el único comando que destruye algo tuyo — secretos, piezas, marcadores, el
 * progreso entero— y estaba a un Enter de distancia. Teclearlo por probar, o
 * dejarlo escrito en una nota y pulsar Enter, y se acabó la colección.
 *
 * Tampoco es un secreto. Encontrarlo no es un logro: es un botón peligroso que
 * conviene saber que existe. Contarlo entre los hallazgos animaba a usarlo, que
 * es exactamente lo contrario de lo que hace falta.
 *
 * PREGUNTA COMO UNA TERMINAL: `¿SEGURO? [y/n]`, y se contesta con una letra
 * suelta. Lo que la hace segura no es que la `y` sea difícil de teclear —no lo
 * es— sino que hay que VOLVER A ESCRIBIR después de haber leído el aviso. Un
 * comando copiado, o dejado escrito en una nota, se queda en la pregunta.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, unlock, art] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/commandUnlock'),
        import('@/lib/system/asciiArt'),
    ]);
    return { ...commands, ...unlock, art };
};

const ctx = () =>
    ({
        now: new Date(),
        sessionStart: new Date(),
        notes: [],
        integrity: 100,
        theme: 'light' as const,
        effectsEnabled: true,
        secretsFound: 0,
        secretsTotal: 27,
        log: '',
        greetings: 0,
        chat: 0,
        kicks: 0,
        lang: 'es' as const,
    });

beforeEach(() => localStorage.clear());

describe('a secas, avisa y no borra nada', () => {
    it('no dispara el borrado', async () => {
        const { run } = await load();

        expect(run('//reset', ctx())!.effect.kind).not.toBe('reset-all');
    });

    it('dice lo que se lleva por delante', async () => {
        const { run } = await load();
        const salida = run('//reset', ctx())!.output;

        expect(salida).toMatch(/SECRETOS/i);
        expect(salida).toMatch(/PIEZAS/i);
    });

    it('y dice, sobre todo, lo que NO se lleva', async () => {
        // Es la mitad que quita el miedo. Sin ella, quien lea el aviso no lo
        // ejecuta nunca — y el comando deja de servir para lo que existe.
        const { run } = await load();

        expect(run('//reset', ctx())!.output).toMatch(/NOTAS/i);
    });

    it('pregunta como una terminal', async () => {
        const { run } = await load();

        expect(run('//reset', ctx())!.output).toContain('[y/n]');
    });
});

describe('contestando', () => {
    it('«y» borra', async () => {
        const { run } = await load();
        run('//reset', ctx());

        expect(run('y', ctx())!.effect.kind).toBe('reset-all');
    });

    it('«s» también, que es lo que se teclea en español', async () => {
        const { run } = await load();
        run('//reset', ctx());

        expect(run('s', ctx())!.effect.kind).toBe('reset-all');
    });

    it('«n» cancela, y lo dice', async () => {
        const { run } = await load();
        run('//reset', ctx());

        const r = run('n', ctx())!;
        expect(r.effect.kind).not.toBe('reset-all');
        expect(r.output).toMatch(/CANCEL/i);
    });

    it('la pregunta no se responde sola dos veces', async () => {
        const { run } = await load();
        run('//reset', ctx());
        run('y', ctx());

        // Una segunda `y` ya no es una respuesta: es texto de una nota.
        expect(run('y', ctx())).toBeNull();
    });
});

describe('sin pregunta en el aire', () => {
    it('una «y» suelta es texto, no un borrado', async () => {
        const { run } = await load();

        expect(run('y', ctx())).toBeNull();
    });

    it('cualquier otro comando retira la pregunta', async () => {
        // Dejarla en el aire convertiría una `y` tecleada más tarde, por
        // cualquier motivo, en un borrado.
        const { run } = await load();

        run('//reset', ctx());
        run('//help', ctx());

        expect(run('y', ctx())).toBeNull();
    });

    it('escribir otra cosa NO cuenta como un no: sigue su camino', async () => {
        const { run } = await load();

        run('//reset', ctx());
        expect(run('una nota cualquiera', ctx())).toBeNull();

        // Y la pregunta sigue en pie: no se contestó.
        expect(run('y', ctx())!.effect.kind).toBe('reset-all');
    });
});

describe('no es un hallazgo', () => {
    it('no cuenta como secreto encontrado', async () => {
        const { run } = await load();

        expect(run('//reset', ctx())!.secretId).toBeUndefined();
        expect(run('y', ctx())!.secretId).toBeUndefined();
    });

    it('tampoco está en la lista del contador', async () => {
        const { SECRET_IDS } = await import('@/hooks/useSystemState');

        // Contarlo entre los hallazgos animaba a usarlo, que es lo contrario de
        // lo que hace falta con el único comando que destruye algo.
        expect(SECRET_IDS).not.toContain('reset');
    });
});
