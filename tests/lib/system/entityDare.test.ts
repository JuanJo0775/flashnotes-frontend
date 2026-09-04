// tests/lib/system/entityDare.test.ts

/**
 * EL RETO DEL //reset.
 *
 * Es el ejemplo perfecto de su forma de pedir: te empuja a una puerta QUE YA
 * ESTABA, sin darte nada. La broma del borrado existe desde mucho antes; él
 * sólo te señala dónde está y se queda mirando.
 */

import { ESQUIVA_A_LOS, RETA_A_LOS } from '@/lib/system/entityTrials';

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
    secretsTotal: 31,
    log: '',
    greetings: 0,
    chat: 1,
    kicks: 0,
    lockedOut: false,
    lang: 'es' as const,
});

/** Un dado que NUNCA daría la broma por su cuenta. */
const DADO_EN_CONTRA = () => 0.9;

const hablarle = (
    run: (l: string, c: unknown, r?: () => number) => { output: string } | null,
    veces: number
) => {
    let salida = '';
    for (let i = 0; i < veces; i += 1) salida = run('//whoareu', ctx())!.output;
    return salida;
};

beforeEach(() => {
    localStorage.clear();
});

it('en hablando, al final, te reta a escribir //reset', async () => {
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');

    const salida = hablarle(run as never, RETA_A_LOS + 1);

    expect(salida).toContain('//reset');
    expect(entity.readEntity().dared).toBe(true);
});

it('⚠ cuando el reto es suyo, la broma del borrado es SEGURA', async () => {
    /*
     * Hoy sale una de cada cinco. Si te promete que vas a descubrir algo y
     * cuatro de cada cinco no pasa nada, el reto se rompe: parecería que
     * mintió, cuando lo único que pasó fue un dado.
     *
     * Que cumpla su palabra justo cuando importa también dice algo de él.
     */
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');
    entity.markDared();

    run('//reset', ctx(), DADO_EN_CONTRA);
    const resultado = run('n', ctx(), DADO_EN_CONTRA)!;

    expect(resultado.effect).toEqual({ kind: 'reset-prank' });
});

it('y sin reto suyo, el dado manda como siempre', async () => {
    // Fuera del reto la gracia es justamente que no se sabe.
    const { run, entity } = await load();
    entity.clearEntity();

    run('//reset', ctx(), DADO_EN_CONTRA);
    const resultado = run('n', ctx(), DADO_EN_CONTRA)!;

    expect(resultado.effect).toEqual({ kind: 'none' });
});

it('decir que SÍ sigue borrando, retado o no', async () => {
    // El reto no puede volver inofensivo el único comando que destruye algo
    // tuyo. Te empuja a la puerta; lo que hay detrás no cambia.
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');
    entity.markDared();

    run('//reset', ctx(), DADO_EN_CONTRA);

    expect(run('s', ctx(), DADO_EN_CONTRA)!.effect).toEqual({ kind: 'reset-all' });
});

it('no escribirlo se le queda, y te lo saca después', async () => {
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');

    // Te reta, y vos seguís hablando sin escribirlo. Él lo nota.
    const salida = hablarle(run as never, ESQUIVA_A_LOS + 1);

    expect(entity.readEntity().dodged).toBe(true);
    expect(salida).toMatch(/miedo/);
});

it('pero te lo saca UNA vez, no en cada frase', async () => {
    // ⚠ Un reproche que sale siempre deja de ser un reproche y pasa a ser un
    // aviso del sistema. Se dice una vez, en el momento en que lo nota.
    // Una sola carga: `load()` resetea los módulos, así que dos dejarían un
    // `run` hablándole a un ente que ya no existe.
    const { run, entity } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');

    hablarle(run as never, ESQUIVA_A_LOS + 1);
    const despues = Array.from(
        { length: 4 },
        () => run('//whoareu', ctx())!.output
    );

    expect(despues.filter((l) => /miedo/.test(l))).toHaveLength(0);
});
