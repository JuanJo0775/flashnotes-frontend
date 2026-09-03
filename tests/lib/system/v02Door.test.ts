// tests/lib/system/v02Door.test.ts

// Sin importaciones estáticas, TypeScript trataría este archivo como un
// script GLOBAL y su `load()` chocaría con el de otro test. Esto lo convierte
// en módulo y le devuelve su ámbito.
export {};

/**
 * La puerta de la v0.2 y su red.
 *
 * Se cargan los módulos aislados porque la bandera y las caídas son estado de
 * módulo: sin aislar, un test contamina al siguiente.
 */
async function load() {
    jest.resetModules();
    const [cmds, morse, v02, dropped] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/morse'),
        import('@/lib/system/v02'),
        import('@/lib/system/dropped'),
    ]);
    return { ...cmds, morse, v02, dropped };
}

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

describe('la puerta · la palabra del morse', () => {
    test('la palabra de la sesión abre la v0.2', async () => {
        const { run, morse } = await load();
        const palabra = morse.sessionWord(() => 0);

        const r = run(`//${palabra}`, ctx())!;

        // La palabra viaja con el efecto: al entrar queda GUARDADA, y es la
        // que sacará mañana. Dentro de la v0.2 el reloj ya no enseña el morse
        // —es la puerta de entrada, no algo de esa versión—, así que sin
        // guardarla bastaría recargar para que la de hoy fuera otra y la salida
        // desapareciera.
        expect(r.effect).toEqual({
            kind: 'toggle-v02',
            entering: true,
            word: palabra,
        });
    });

    test('no distingue mayúsculas: se descifra a mano', async () => {
        const { run, morse } = await load();
        const palabra = morse.sessionWord(() => 0);

        expect(run(`//${palabra.toLowerCase()}`, ctx())!.effect.kind).toBe(
            'toggle-v02'
        );
    });

    test('otra palabra cualquiera no abre nada', async () => {
        const { run, morse } = await load();
        morse.sessionWord(() => 0);

        expect(run('//cualquiera', ctx())!.output).toMatch(/DESCONOCIDO/i);
    });

    test('sin haber mirado el reloj, la palabra no existe', async () => {
        // Sin sortear, `isSessionWord` no reconoce nada: teclear a ciegas no
        // puede colarse por casualidad.
        const { run, morse } = await load();

        expect(run(`//${morse.WORDS[0]}`, ctx())!.output).toMatch(/DESCONOCIDO/i);
    });

    test('la misma palabra sale', async () => {
        // Un estado del que no se puede salir sería una app rota, no un secreto.
        const { run, morse, v02 } = await load();
        const palabra = morse.sessionWord(() => 0);

        run(`//${palabra}`, ctx());
        v02.enterV02(palabra);

        expect(run(`//${palabra}`, ctx())!.effect).toEqual({
            kind: 'toggle-v02',
            entering: false,
            word: palabra,
        });
    });

    test('la palabra GUARDADA sale, aunque la de hoy sea otra', async () => {
        // El caso que de verdad importa: entraste ayer, recargaste, y el morse
        // de esta sesión dice otra cosa. Dentro no hay dónde mirar la nueva, así
        // que si sólo valiera ésa quedarías encerrado.
        const { run, morse, v02 } = await load();

        v02.enterV02('NIDO');
        const otra = morse.sessionWord(() => 0.9);
        expect(otra).not.toBe('NIDO');

        expect(run('//nido', ctx())!.effect.kind).toBe('toggle-v02');
    });

    test('NO sale en la ayuda, ni tachada', async () => {
        // Cambia por sesión: metida en la lista se filtraría por `//help` y por
        // las ventanas de error, que sólo conocen los comandos declarados.
        const { run, morse } = await load();
        const palabra = morse.sessionWord(() => 0);
        const r = run('//help', ctx(), () => 0.5)!;

        expect(r.output).not.toContain(palabra.toLowerCase());
        expect(JSON.stringify(r.rows)).not.toContain(palabra.toLowerCase());
    });
});

describe('la red · //recover', () => {
    /*
     * `//recover` SÓLO EXISTE EN LA v0.2. Es la red de esa versión, y nadie la
     * llevó a la nueva porque la nueva no la necesita: no pierde notas. Por eso
     * cada test de acá enciende la bandera antes — fuera de la v0.2 el comando
     * contesta «desconocido», igual que una palabra inventada.
     */
    test('sin nada caído, lo dice', async () => {
        const { run, v02 } = await load();
        v02.enterV02('NIDO');

        expect(run('//recover', ctx())!.output).toMatch(/NO SE CAYÓ NADA/);
    });

    test('devuelve lo que no se guardó', async () => {
        // Perder de verdad, sí; perder para siempre y sin aviso, no.
        const { run, dropped, v02 } = await load();
        v02.enterV02('NIDO');
        dropped.rememberDropped('abc', 'T', 'lo que estaba escribiendo');

        const r = run('//recover', ctx())!;

        expect(r.effect).toEqual({
            kind: 'recover',
            text: 'lo que estaba escribiendo',
        });
    });

    test('devuelve lo ÚLTIMO que se cayó', async () => {
        const { run, dropped, v02 } = await load();
        v02.enterV02('NIDO');
        dropped.rememberDropped('a', 'T', 'viejo');
        dropped.rememberDropped('b', 'T', 'nuevo');

        const r = run('//recover', ctx())!;

        if (r.effect.kind !== 'recover') throw new Error('no recuperó nada');
        expect(r.effect.text).toBe('nuevo');
    });

    test('de una misma nota guarda la versión más reciente', async () => {
        const { dropped } = await load();
        dropped.rememberDropped('a', 'T', 'primera');
        dropped.rememberDropped('a', 'T', 'segunda');

        expect(dropped.allDropped()).toHaveLength(1);
        expect(dropped.droppedFor('a')?.content).toBe('segunda');
    });
});
