// tests/lib/system/artLighthouse.test.ts

/**
 * EL FARO PREMIA HABER ESTADO PERDIDO.
 *
 * Tecleás algo que no existe, la máquina no te deja a oscuras —te señala
 * `//help`— y vos venís. Eso es un faro: la luz llevaba encendida desde el
 * principio y sólo hacía falta mirarla.
 *
 * ⚠ LA MITAD IMPORTANTE ES QUE `//help` A SECAS NO BASTA. Es el comando más
 * obvio de la app: darla por teclearlo la regalaría en el primer minuto y a todo
 * el mundo. Lo que se premia no es la lista, es haber seguido la señal.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, art] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/asciiArt'),
    ]);
    return { ...commands, art };
};

const ctx = () => ({
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

beforeEach(() => {
    localStorage.clear();
});

it('//help a secas NO da el faro', async () => {
    const { run, art } = await load();
    art.clearFound();

    run('//help', ctx(), () => 0.5);

    expect(art.readFound().has('lighthouse')).toBe(false);
});

it('pero después de la pista, sí', async () => {
    const { run, art } = await load();
    art.clearFound();

    run('//loquesea', ctx(), () => 0.5);
    run('//help', ctx(), () => 0.5);

    expect(art.readFound().has('lighthouse')).toBe(true);
});

it('y la pista sobrevive a recargar', async () => {
    // Entre perderse y hacer caso puede haber una recarga. Perder el hilo ahí
    // dejaría el premio dependiendo de si te distrajiste.
    const primera = await load();
    primera.art.clearFound();
    primera.run('//loquesea', ctx(), () => 0.5);

    const segunda = await load();
    segunda.run('//help', ctx(), () => 0.5);

    expect(segunda.art.readFound().has('lighthouse')).toBe(true);
});

it('//reset olvida la pista: el faro no se recupera solo', async () => {
    /*
     * ⚠ ERA LA ÚNICA CLAVE QUE EL BORRADO NO TOCABA.
     *
     * `flashnotes:helpHint` sobrevivía a `//reset`, así que el primer `//help`
     * de después devolvía el faro sin haberse vuelto a perder nadie. Un borrado
     * que deja una pieza puesta no es un borrado — y encima es la pieza que
     * premia haber estado perdido, o sea la que peor sienta de regalo.
     */
    const { run, art } = await load();
    const { forgetHint, sawHint } = await import('@/lib/system/helpHint');

    art.clearFound();
    run('//loquesea', ctx(), () => 0.5);
    expect(sawHint()).toBe(true);

    forgetHint();
    art.clearFound();

    run('//help', ctx(), () => 0.5);

    expect(art.readFound().has('lighthouse')).toBe(false);
});
