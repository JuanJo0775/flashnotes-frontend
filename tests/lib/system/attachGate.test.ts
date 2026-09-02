// tests/lib/system/attachGate.test.ts

/**
 * `//attach_*` NO EXISTE HASTA QUE HAYAS VISTO `//ps`.
 *
 * Ése era el trato desde el principio —«sólo se llega desde `//ps`, que es lo que
 * lo convierte en un hallazgo»— y no se estaba cumpliendo: el comando resolvía
 * igual lo hubieras leído o no. Quien probara `//attach_1` a ciegas se topaba con
 * la lista de procesos sin haberla pedido, y el hallazgo dejaba de serlo.
 *
 * ⚠ LA RESPUESTA TIENE QUE SER LA MISMA que la de una palabra inventada. Un
 * «todavía no» sería peor que nada: confirma que ahí hay algo y convierte la
 * puerta cerrada en un cartel.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, unlock] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/commandUnlock'),
    ]);
    return { ...commands, ...unlock };
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
        secretsTotal: 18,
        log: '',
        greetings: 0,
        chat: 0,
        kicks: 0,
        lang: 'es' as const,
    });

beforeEach(() => localStorage.clear());

describe('sin haber usado //ps', () => {
    it('//attach_6 contesta lo mismo que un comando inventado', async () => {
        const { run } = await load();

        const attach = run('//attach_6', ctx())!;
        const inventado = run('//attach_6', ctx())!;

        expect(attach.output).toMatch(/DESCONOCIDO/i);
        expect(attach.output).toBe(inventado.output);
    });

    it('no abre el pong', async () => {
        const { run } = await load();

        expect(run('//attach_6', ctx())!.effect.kind).not.toBe('play-pong');
    });

    it('tampoco delata los otros PID', async () => {
        // Contestar «ese proceso no existe» a `//attach_1` diría que los PID
        // significan algo. Todos callan igual.
        const { run } = await load();

        for (const pid of [1, 2, 3, 99]) {
            expect(run(`//attach_${pid}`, ctx())!.output).toMatch(/DESCONOCIDO/i);
        }
    });

    it('no se desbloquea de rebote: sigue tachado en la ayuda', async () => {
        const { run, isUnlocked } = await load();

        run('//attach_6', ctx());

        expect(isUnlocked('//attach_6')).toBe(false);
    });
});

describe('después de usar //ps', () => {
    it('//attach_6 abre el pong', async () => {
        const { run } = await load();

        run('//ps', ctx());

        expect(run('//attach_6', ctx())!.effect.kind).toBe('play-pong');
    });

    it('los demás PID contestan lo suyo, no «desconocido»', async () => {
        // Una vez leída la lista, los procesos SON algo: negarse con su nombre
        // es la mitad de la gracia.
        const { run } = await load();

        run('//ps', ctx());

        expect(run('//attach_1', ctx())!.output).not.toMatch(/DESCONOCIDO/i);
    });

    it('y un PID que no está en la lista sigue diciendo que no existe', async () => {
        const { run } = await load();

        run('//ps', ctx());

        expect(run('//attach_99', ctx())!.output).toMatch(/99/);
    });
});
