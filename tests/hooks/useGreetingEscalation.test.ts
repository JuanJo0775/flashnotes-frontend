// tests/hooks/useGreetingEscalation.test.ts
import { KICK_AT } from '@/lib/system/greeting';

/**
 * La escalada por la ruta de verdad: el almacén cuenta, el comando responde.
 *
 * La lógica pura ya está cubierta en greeting.test.ts. Lo que se prueba acá es
 * el cableado, que es donde de verdad se rompe: quién cuenta, cuándo, y que
 * teclear otros comandos no sume.
 */
async function load() {
    jest.resetModules();
    const [system, commands] = await Promise.all([
        import('@/hooks/useSystemState'),
        import('@/lib/system/commands'),
    ]);
    return { ...system, ...commands };
}

const ctx = (greetings: number) => ({
    now: new Date(),
    sessionStart: new Date(),
    notes: [],
    integrity: 100,
    theme: 'light' as const,
    effectsEnabled: true,
    secretsFound: 0,
    secretsTotal: 16,
    log: '',
    greetings,
    chat: 0,
    kicks: 0,
    lang: 'es' as const,
});

beforeEach(() => localStorage.clear());

describe('//hi · la escalada, por la ruta real', () => {
    test('el primer saludo cuenta uno', async () => {
        const { registerGreeting } = await load();

        expect(registerGreeting(1000)).toBe(1);
    });

    test('saludar seguido escala hasta que te echa', async () => {
        const { registerGreeting, run } = await load();

        let cuenta = 0;
        for (let i = 0; i < KICK_AT; i += 1) cuenta = registerGreeting(1000 + i);

        expect(cuenta).toBe(KICK_AT);
        expect(run('//hi', ctx(cuenta))!.effect).toEqual({ kind: 'leave-note' });
    });

    test('antes del límite no echa a nadie', async () => {
        const { registerGreeting, run } = await load();

        let cuenta = 0;
        for (let i = 0; i < KICK_AT - 1; i += 1) cuenta = registerGreeting(1000 + i);

        expect(run('//hi', ctx(cuenta))!.effect.kind).toBe('none');
    });

    test('saludar marca el secreto', async () => {
        const { registerGreeting, getSystemState } = await load();

        const antes = getSystemState().secretsFound;
        registerGreeting(1000);

        expect(getSystemState().secretsFound).toBe(antes + 1);
    });
});

describe('//hi · sólo el saludo cuenta como saludo', () => {
    // Sumar en cada comando haría que teclear `//help` ocho veces te echara de
    // la nota, que no es la broma.
    test('reconoce el saludo', async () => {
        const { isGreetingLine } = await load();

        expect(isGreetingLine('//hi')).toBe(true);
    });

    test('no le importan las mayúsculas', async () => {
        const { isGreetingLine } = await load();

        expect(isGreetingLine('//HI')).toBe(true);
    });

    test('los demás comandos no son saludos', async () => {
        const { isGreetingLine } = await load();

        for (const c of ['//help', '//ps', '//date', '//hiya', '//h']) {
            expect(isGreetingLine(c)).toBe(false);
        }
    });

    test('el texto normal tampoco', async () => {
        const { isGreetingLine } = await load();

        expect(isGreetingLine('hola, hi')).toBe(false);
    });
});

describe('//date_off · suelta el reloj', () => {
    test('pide el desvarío', async () => {
        const { run } = await load();

        expect(run('//date_off', ctx(0))!.effect).toEqual({ kind: 'time-drift' });
    });

    test('NO dice cómo arreglarlo', async () => {
        // Decir «recargue para que vuelva» convierte la avería en una
        // instrucción: sabés que es temporal y que hay salida, y se deja de
        // sentir como que el sistema perdió algo. La salida sigue estando; sólo
        // que hay que dar con ella.
        const { run } = await load();

        expect(run('//date_off', ctx(0))!.output).not.toMatch(/RECARGUE|RELOAD/i);
    });

    test('pero sí dice lo que le pasó', async () => {
        const { run } = await load();

        expect(run('//date_off', ctx(0))!.output).toMatch(/AÑO|YEAR/i);
    });

    test('no lo confunde con //date', async () => {
        const { run } = await load();

        expect(run('//date', ctx(0))!.effect.kind).toBe('none');
    });
});
