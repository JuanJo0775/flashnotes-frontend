// tests/lib/system/entityLie.test.ts

/**
 * LO FALSO TIENE QUE SER DESMENTIBLE.
 *
 * Una mentira que no se puede descubrir no es una trampa: es una app rota. Ésta
 * dice que no corre nada más que él, y `//ps` lista varios procesos. La prueba
 * ya estaba en el juego mucho antes que la mentira, y ése es el punto — no se
 * añadió un comando para desmentirlo, se eligió una mentira que el juego ya
 * podía desmentir.
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

const ctx = () => ({
    now: new Date(),
    sessionStart: new Date(),
    notes: [],
    integrity: 100,
    theme: 'light' as const,
    effectsEnabled: true,
    secretsFound: 0,
    secretsTotal: 31,
    log: '',
    greetings: 0,
    chat: 1,
    kicks: 0,
    lockedOut: false,
    lang: 'es' as const,
});

/**
 * Hasta `burlon` SIN palabra de viaje: ahí lo que toca es mentir.
 *
 * Es el caso de quien despertó al ente por el fallo total y nunca cruzó a la
 * v0.2 — no hay nada que él pueda comprobar, así que la puerta es la mentira.
 */
const hastaLaMentira = async () => {
    localStorage.clear();
    const cargado = await load();
    cargado.entity.clearEntity();
    cargado.v02.forgetV02Cache();
    cargado.entity.setPhase('burlon');
    return cargado;
};

const hablarle = (
    run: (l: string, c: unknown) => { output: string } | null,
    veces: number
) => {
    let salida = '';
    for (let i = 0; i < veces; i += 1) salida = run('//whoareu', ctx())!.output;
    return salida;
};

beforeEach(() => {
    localStorage.clear();
});

it('sin palabra que comprobar, miente', async () => {
    const { run } = await hastaLaMentira();

    const salida = hablarle(run as never, 4);

    expect(salida).toBe(salida.toLowerCase());
    expect(salida).toMatch(/corre/);
});

it('y no la repite mientras siga en pie', async () => {
    // Decirla dos veces la delata como guion, no como afirmación.
    const { run } = await hastaLaMentira();
    hablarle(run as never, 4);

    const siguiente = run('//whoareu', ctx())!.output;

    expect(siguiente).not.toMatch(/corre/);
});

it('//ps la desmiente: eso abre hablando', async () => {
    const { run, entity } = await hastaLaMentira();
    hablarle(run as never, 4);

    const salida = run('//ps', ctx())!.output;

    // ⚠ `//ps` SIGUE HACIENDO LO SUYO: la lista de procesos no desaparece, se
    // le añade lo que él dice al verse pillado. Tragarse la salida del comando
    // convertiría una prueba en un truco.
    expect(salida).toMatch(/PID|proc/i);
    expect(salida).toMatch(/miraste/);
    expect(entity.readEntity().phase).toBe('hablando');
});

it('pero //ps sin mentira en pie no abre nada', async () => {
    // Correrlo por costumbre no puede regalarte la fase.
    const { run, entity } = await load();
    entity.clearEntity();

    const salida = run('//ps', ctx())!.output;

    expect(salida).not.toMatch(/miraste/);
    expect(entity.readEntity().phase).toBe('dormido');
});

describe('⚠ CUÁNDO CADUCA, QUE NO ES SIEMPRE', () => {
    /*
     * Con palabra guardada, tragársela CIERRA esa puerta: queda la pregunta,
     * así que no encierra a nadie.
     *
     * Sin palabra, la mentira es el ÚNICO camino a `hablando`, y darla por
     * tragada obligaba a volver a decirla para no dejarte encerrado. Repetir
     * una afirmación dos frases después lo delata como un guion en bucle. Así
     * que ahí no caduca: se queda en pie, esperando a que vayas a mirar.
     */

    it('sin palabra, no caduca nunca: sigue esperando', async () => {
        const { run, entity } = await hastaLaMentira();

        hablarle(run as never, 12);

        expect(entity.readEntity().lieSwallowed).toBeFalsy();
        expect(entity.readEntity().lieStanding).toBe(true);
    });

    it('y no la repite en todo ese rato', async () => {
        const { run } = await hastaLaMentira();
        hablarle(run as never, 4);

        const despues = Array.from(
            { length: 8 },
            () => run('//whoareu', ctx())!.output
        );

        expect(despues.filter((l) => /corre/.test(l))).toHaveLength(0);
    });

    it('así que //ps sigue valiendo mucho después', async () => {
        const { run, entity } = await hastaLaMentira();
        hablarle(run as never, 12);

        expect(run('//ps', ctx())!.output).toMatch(/miraste/);
        expect(entity.readEntity().phase).toBe('hablando');
    });
});
