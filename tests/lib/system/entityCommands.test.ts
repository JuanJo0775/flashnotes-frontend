// tests/lib/system/entityCommands.test.ts

/**
 * LAS DOS PREGUNTAS, AHORA CON ALGUIEN DETRÁS.
 *
 * Dormido, todo sigue igual: dos respuestas y dejan de existir. Despierto, las
 * mismas palabras llegan a otro sitio — y ése es el hallazgo. El mismo comando,
 * otra respuesta.
 *
 * ⚠ EL ENTE ESCUCHA DONDE LA MÁQUINA NO ENTIENDE. Las variantes escritas a mano
 * (`//quien`, `//como`…) no son comandos declarados: se recogen en la rama del
 * «comando desconocido». Por eso no aparecen en `//help`, no cuentan para el
 * arte de la terminal, y funcionan dentro de la v0.2 sin tocar nada — ahí
 * `//whoareu` está filtrado y cae solo en esa rama.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, entity, v02] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/entity'),
        import('@/lib/system/v02'),
    ]);
    return { ...commands, entity, v02 };
};

const ctx = (chat = 1) => ({
    now: new Date(),
    sessionStart: new Date(),
    notes: [],
    integrity: 100,
    theme: 'light' as const,
    effectsEnabled: true,
    secretsFound: 0,
    secretsTotal: 28,
    log: '',
    greetings: 0,
    chat,
    // Sin expulsiones: `kicked` es `kicks > 1`, así que 0 y 1 son «todavía no».
    kicks: 0,
    lockedOut: false,
    lang: 'es' as const,
});

beforeEach(() => {
    localStorage.clear();
});

describe('dormido', () => {
    it('contesta lo de siempre, a gritos', async () => {
        const { run, entity } = await load();
        entity.clearEntity();

        const salida = run('//whoareu', ctx())!.output;

        expect(salida).toBe(salida.toUpperCase());
    });

    it('y las variantes no existen: son un comando desconocido', async () => {
        // Si contestara sin estar despierto, no habría nada que descubrir.
        const { run, entity } = await load();
        entity.clearEntity();

        // `toContain` y no `toUpperCase`: el mensaje de desconocido lleva
        // `//help` dentro, en minúscula, porque es un comando que se teclea.
        expect(run('//quien_eres', ctx())!.output).toContain('DESCONOCIDO');
    });
});

describe('despierto', () => {
    it('el mismo comando da otra respuesta, y en minúsculas', async () => {
        const { run, entity, v02 } = await load();
        entity.clearEntity();

        // Estuvo donde no se podía: entró y salió de la v0.2.
        v02.markV02RoundTrip();

        const salida = run('//whoareu', ctx())!.output;

        expect(salida).toBe(salida.toLowerCase());
    });

    it('y reconoce las variantes escritas a mano', async () => {
        const { run, entity, v02 } = await load();
        entity.clearEntity();
        v02.markV02RoundTrip();

        const quien = run('//quien_eres', ctx())!.output;
        const como = run('//como_estas', ctx())!.output;

        expect(quien).toBe(quien.toLowerCase());
        expect(como).toBe(como.toLowerCase());
    });

    it('pero lo que no es una pregunta suya sigue siendo desconocido', async () => {
        // ⚠ La rama del «comando desconocido» es la que enciende el faro de
        // `//help`. Si el ente se tragara todo, esa pista se perdería.
        const { run, entity, v02 } = await load();
        entity.clearEntity();
        v02.markV02RoundTrip();

        expect(run('//palabra', ctx())!.output).toContain('DESCONOCIDO');
    });

    it('cada pregunta suma un intercambio', async () => {
        const { run, entity, v02 } = await load();
        entity.clearEntity();
        v02.markV02RoundTrip();

        run('//whoareu', ctx());
        run('//howareu', ctx());

        expect(entity.readEntity().exchanges).toBe(2);
    });

    it('y volviendo lo bastante, se suelta', async () => {
        // `RETURN_AT` intercambios en `receloso` y pasa a `burlon`.
        const { run, entity, v02 } = await load();
        entity.clearEntity();
        v02.markV02RoundTrip();

        for (let i = 0; i < entity.RETURN_AT + 1; i += 1) run('//whoareu', ctx());

        expect(entity.readEntity().phase).toBe('burlon');
    });
});
