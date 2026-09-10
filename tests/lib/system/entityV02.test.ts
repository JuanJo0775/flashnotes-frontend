// tests/lib/system/entityV02.test.ts

/**
 * EN LA v0.2 HABLA ROTO.
 *
 * Un canal más viejo es un canal peor, y eso ya lo dice el código: `v02Label`
 * rompe una de cada cuatro etiquetas de tres formas —sin traducir, a medio
 * hacer, mal traducida— y es determinista por clave.
 *
 * El ente hablando por ahí sale mutilado SIN INVENTAR NADA. Es la limitación
 * hecha visible: está encerrado, y desde más adentro se le entiende peor.
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
    soundEnabled: true,
    secretsFound: 0,
    secretsTotal: 29,
    log: '',
    greetings: 0,
    chat: 1,
    kicks: 0,
    lockedOut: false,
    lang: 'es' as const,
});

/** Seis respuestas seguidas, despierto, dentro o fuera de la v0.2. */
const conversacion = async (dentro: boolean): Promise<string[]> => {
    localStorage.clear();
    const { run, entity, v02 } = await load();
    entity.clearEntity();
    v02.markV02RoundTrip();

    if (dentro) {
        v02.enterV02('NIDO');
        v02.forgetV02Cache();
    }

    return Array.from({ length: 6 }, () => run('//whoareu', ctx())!.output);
};

beforeEach(() => {
    localStorage.clear();
});

it('fuera de la v0.2 se le entiende', async () => {
    // Todas en minúsculas y sin mutilar: el canal está bien.
    for (const linea of await conversacion(false)) {
        expect(linea).toBe(linea.toLowerCase());
    }
});

it('la misma conversación, desde la v0.2, no sale igual', async () => {
    /*
     * No se comprueba CÓMO se rompe —de eso se ocupa `v02Label` y ya tiene sus
     * tests— sino que pasa por ahí. Se comparan las seis seguidas y no una
     * sola porque el destrozo toca una de cada cuatro: con una sola respuesta
     * el test sería una moneda al aire disfrazada de aserción.
     */
    const fuera = await conversacion(false);
    const dentro = await conversacion(true);

    expect(dentro).not.toEqual(fuera);
});

it('⚠ pero casi nunca se lo lleva ENTERO', async () => {
    /*
     * Si saliera todo ilegible sería una avería, no una versión vieja.
     *
     * ⚠ Y LO QUE HAY QUE CONTAR NO SON LAS FRASES INTACTAS. Este test las
     * contaba, y dejó de valer en cuanto la v0.2 tuvo más de una avería: una
     * respuesta que llega en inglés o a gritos con «(SIC)» está tocada y se
     * entiende PERFECTAMENTE, y una censurada cuenta media idea. Exigir que la
     * mayoría llegue idéntica era exigir que casi no se rompiera nada.
     *
     * De las tres averías, sólo una se lleva el mensaje entero: la de «a medio
     * hacer», que devuelve el nombre de la variable con su número —
     * `ENTE:HABLANDO:0_304`— porque ese texto no llegó a escribirse. Ésa es la
     * que tiene que ser minoría, y es lo único que este test tiene que
     * sostener.
     */
    const dentro = await conversacion(true);
    const A_MEDIO_HACER = /^ENTE:[A-Z0-9:_]+$/;

    const perdidas = dentro.filter((l) => A_MEDIO_HACER.test(l)).length;

    expect(perdidas).toBeLessThan(dentro.length / 2);
});

it('y alguna llega tal cual, o el canal estaría roto y no viejo', async () => {
    // Una versión vieja rompe una de cada cuatro etiquetas. Una que las rompa
    // todas no es vieja: está averiada, que es otra historia y no ésta.
    const fuera = await conversacion(false);
    const dentro = await conversacion(true);

    // La primera de la v0.2 no cuenta: ahí él toma la palabra en vez de
    // contestar, y eso no es el canal rompiendo nada.
    const intactas = dentro.slice(1).filter((l, i) => l === fuera[i + 1]).length;

    expect(intactas).toBeGreaterThan(0);
});

it('⚠ y lo primero que dice ahí es que no entiende cómo llegaste', async () => {
    /*
     * Se pidió jugando: «que él te diga cómo llegaste». Es el único sitio de
     * todo el repertorio donde toma la palabra — preguntaste una cosa y te
     * devuelve otra, porque lo que está pasando le importa más.
     *
     * Va acá y no en el fichero de los límites porque lo que se comprueba es lo
     * que VE quien teclea: que la primera respuesta desde la v0.2 no sea la
     * respuesta.
     */
    const dentro = await conversacion(true);

    expect(dentro[0]).toMatch(/cómo llegaste|CÓMO LLEGASTE|how did you get here/i);
    expect(dentro[1]).not.toMatch(/cómo llegaste/i);
});

it('despertarlo cuenta como secreto', async () => {
    const { run, entity, v02 } = await load();
    entity.clearEntity();
    v02.markV02RoundTrip();

    expect(run('//whoareu', ctx())!.secretId).toBe('entity-awake');
});

it('y ese secreto no es el de la charla con la fachada', async () => {
    // `chat` es haber hablado con el formulario; `entity-awake` es haber
    // notado que detrás hay alguien. Dos hallazgos, no uno.
    const { run, entity } = await load();
    entity.clearEntity();

    expect(run('//whoareu', ctx())!.secretId).toBe('chat');
});

it('//reset lo vuelve a dormir', async () => {
    /*
     * El mismo cabo que se soltó una vez con `flashnotes:helpHint`: una clave
     * nueva que el borrado no tocaba. Acá sería peor — el ente sería lo único
     * del sistema que se acuerda de vos cuando ya nada más lo hace, y eso es
     * otro secreto, no el que hay.
     */
    const { run, entity, v02 } = await load();
    entity.clearEntity();
    v02.markV02RoundTrip();

    run('//whoareu', ctx());
    expect(entity.readEntity().phase).toBe('receloso');

    const { resetEverything } = await import('@/hooks/useSystemState');
    resetEverything();

    expect(entity.readEntity().phase).toBe('dormido');
});
