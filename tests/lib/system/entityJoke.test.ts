// tests/lib/system/entityJoke.test.ts

/**
 * «ERA BROMA».
 *
 * Te mandó a buscar un archivo que no está. El remate llega cuando volvés a
 * hablarle DESPUÉS de haber ido a mirar: sin haber mirado no hay nada de qué
 * reírse, y soltarlo antes convertiría la broma en un aviso.
 *
 * No hay premio y no hay castigo. Hay que se rió de vos, que es lo suyo.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, entity] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/entity'),
    ]);
    return { ...commands, entity };
};

const ctx = () => ({
    now: new Date(),
    sessionStart: new Date(),
    notes: [],
    integrity: 100,
    theme: 'light' as const,
    effectsEnabled: true,
    secretsFound: 0,
    secretsTotal: 32,
    log: '',
    greetings: 0,
    chat: 1,
    kicks: 0,
    lockedOut: false,
    lang: 'es' as const,
});

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

it('sin haber ido a mirar, no remata nada', async () => {
    // Soltarlo antes convierte la broma en un aviso: te estaría diciendo que
    // no busques justo cuando te acaba de mandar a buscar.
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');
    entity.markLeft('broma');

    expect(hablarle(run as never, 4)).not.toMatch(/era.*broma|estaba/i);
});

it('y sin broma de por medio tampoco, aunque hayas mirado', async () => {
    // Abrir la papelera por tu cuenta no puede provocar un remate sin chiste.
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');
    entity.markLooked();

    expect(hablarle(run as never, 4)).not.toMatch(/era.*broma|estaba/i);
});

it('pero si fuiste a mirar, te lo dice', async () => {
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');
    entity.markLeft('broma');
    entity.markLooked();

    const salida = run('//whoareu', ctx())!.output;

    expect(salida).toBe(salida.toLowerCase());
    expect(salida).toMatch(/no está|no hay/);
});

it('⚠ una sola vez, no en cada frase', async () => {
    // Un remate que se repite deja de ser un remate y pasa a ser un tic.
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');
    entity.markLeft('broma');
    entity.markLooked();

    run('//whoareu', ctx());
    const despues = Array.from(
        { length: 4 },
        () => run('//whoareu', ctx())!.output
    );

    expect(despues.filter((l) => /no está|no hay/.test(l))).toHaveLength(0);
});

it('y no da ni premio ni castigo', async () => {
    // Sólo se rió de vos. Meterle un secreto lo convertiría en contenido.
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');
    entity.markLeft('broma');
    entity.markLooked();

    const resultado = run('//whoareu', ctx())!;

    expect(resultado.effect).toEqual({ kind: 'none' });
    expect(resultado.secretId).toBe('entity-awake');
});
