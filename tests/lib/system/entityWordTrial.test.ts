// tests/lib/system/entityWordTrial.test.ts

/**
 * LA ÚNICA PREGUNTA DEL JUEGO CUYA RESPUESTA EL SISTEMA CONOCE.
 *
 * Está en `flashnotes:v02word`, así que él puede comprobarla de verdad. No es
 * un acertijo con la solución escondida en el código: es la palabra que
 * tecleaste vos, y que él vio.
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

/** Lo lleva hasta `burlon` con la palabra guardada, listo para que mida. */
const hastaBurlon = async () => {
    localStorage.clear();
    const cargado = await load();
    cargado.entity.clearEntity();

    /*
     * ⚠ EL ORDEN ES EL DE VERDAD, y no da igual.
     *
     * Así es como pasa en `run()`: estás dentro, tecleás la palabra, se marca
     * el viaje —que es cuando se queda con ella— y recién entonces se sale.
     * Marcarlo antes de entrar deja el viaje sin palabra, que es justo el caso
     * de los viajes viejos.
     */
    cargado.v02.enterV02('NIDO');
    cargado.v02.markV02RoundTrip();
    cargado.v02.leaveV02();
    cargado.v02.forgetV02Cache();

    cargado.entity.setPhase('burlon');
    return cargado;
};

/** Cuatro preguntas: las tres del repertorio y la que dispara la trampa. */
const hastaQuePregunte = (run: (l: string, c: unknown) => unknown) => {
    let salida = '';
    for (let i = 0; i < 4; i += 1) {
        salida = (run('//whoareu', ctx()) as { output: string }).output;
    }
    return salida;
};

beforeEach(() => {
    localStorage.clear();
});

it('en burlón, al rato, pregunta con qué palabra entraste', async () => {
    const { run, entity } = await hastaBurlon();

    const salida = hastaQuePregunte(run as never);

    expect(salida).toContain('0.2');
    expect(entity.readEntity().asking).toBe('word');
});

it('acertarla abre hablando', async () => {
    const { run, entity } = await hastaBurlon();
    hastaQuePregunte(run as never);

    const salida = run('//nido', ctx())!.output;

    expect(salida).toBe(salida.toLowerCase());
    expect(entity.readEntity().phase).toBe('hablando');
    expect(entity.readEntity().asking).toBeUndefined();
});

it('⚠ y contestarla NO cruza la puerta de la v0.2', async () => {
    /*
     * La respuesta ES la palabra, y teclear la palabra normalmente entra en la
     * v0.2. Si la recogida no fuera ANTES de esa puerta, contestarle bien te
     * mandaría a la versión vieja en vez de abrirte el lore: la recompensa
     * exacta que no corresponde, y encima confusa.
     */
    const { run, entity, v02 } = await hastaBurlon();
    hastaQuePregunte(run as never);

    run('//nido', ctx());

    expect(v02.isV02()).toBe(false);
    expect(entity.readEntity().phase).toBe('hablando');
});

it('fallarla no te dice que fallaste', async () => {
    const { run, entity } = await hastaBurlon();
    hastaQuePregunte(run as never);

    const salida = run('//casa', ctx())!.output;

    expect(salida).toBe(salida.toLowerCase());
    expect(salida).not.toMatch(/incorrect|error|\bmal\b/i);
    expect(entity.readEntity().phase).toBe('burlon');
});

it('y la pregunta sólo se come UNA línea', async () => {
    // Fallar la retira. Si se quedara puesta, el siguiente comando que
    // tecleases dejaría de funcionar y parecería que la app se colgó.
    const { run, entity } = await hastaBurlon();
    hastaQuePregunte(run as never);

    run('//casa', ctx());
    expect(entity.readEntity().asking).toBeUndefined();

    expect(run('//help', ctx())!.output).toContain('//');
});

it('la trampa sustituye a la respuesta, no se le añade', async () => {
    // Cuando decide medirte deja de contestar. Decir las dos cosas leería la
    // pregunta como un añadido y no como lo que hace él.
    const { run } = await hastaBurlon();

    const salida = hastaQuePregunte(run as never);

    expect(salida).not.toMatch(/preguntando|sabés más/);
});
