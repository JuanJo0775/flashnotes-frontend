// tests/lib/system/entityGift.test.ts

/**
 * EL REGALO DE LA NOTA DEL DÍA SIGUIENTE.
 *
 * Volviste, había una nota esperándote con instrucciones, y las cumpliste. Es
 * lo único del juego que premia haber vuelto — y lo único que él no puede
 * fingir que pasó.
 *
 * ⚠ EL REGALO ES UN SECRETO, NO UNA PIEZA. Una pieza lo convertiría en un
 * dispensador de contenido, que es exactamente lo que el diseño prohíbe: un
 * favor que desbloquea algo es una misión, y entonces el ente pasa a ser un
 * menú. Un secreto cuenta el hallazgo sin entregarte un objeto.
 */

export {};

const load = async () => {
    jest.resetModules();
    const [commands, entity, notes] = await Promise.all([
        import('@/lib/system/commands'),
        import('@/lib/system/entity'),
        import('@/lib/system/entityNotes'),
    ]);
    return { ...commands, entity, notes };
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

beforeEach(() => {
    localStorage.clear();
});

it('la palabra está ESCRITA en la nota, no hay que adivinarla', async () => {
    /*
     * Si hubiera que adivinarla no serían instrucciones, sería otro acertijo —
     * y de ésos ya hay bastantes. Lo que se premia acá es haber vuelto y
     * haberle hecho caso, no descifrar nada.
     */
    const { notes } = await load();

    for (const lang of ['es', 'en'] as const) {
        expect(notes.leftNoteText('vuelta', lang)).toContain(
            `//${notes.GIFT_WORD}`
        );
    }
});

it('sin la nota de por medio, la palabra no existe', async () => {
    // Teclearla por casualidad no puede dar nada: el regalo es por haber
    // vuelto, y sin nota no volviste a nada.
    const { run, entity, notes } = await load();
    entity.clearEntity();

    const salida = run(`//${notes.GIFT_WORD}`, ctx())!;

    expect(salida.output).toContain('DESCONOCIDO');
    expect(salida.secretId).toBeUndefined();
});

it('con la nota dejada, cumplir las instrucciones tiene regalo', async () => {
    const { run, entity, notes } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');
    entity.markLeft('vuelta');

    const salida = run(`//${notes.GIFT_WORD}`, ctx())!;

    expect(salida.output).toBe(salida.output.toLowerCase());
    expect(salida.secretId).toBe('entity-gift');
});

it('y te dice algo que no sabías, que es lo que prometió', async () => {
    // La nota dice «vas a saber algo que no sabías». Si no dijera nada nuevo
    // sería la única promesa suya que no cumple, y las suyas se cumplen.
    const { run, entity, notes } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');
    entity.markLeft('vuelta');

    expect(run(`//${notes.GIFT_WORD}`, ctx())!.output.length).toBeGreaterThan(20);
});

it('⚠ y no da una pieza: no es un dispensador', async () => {
    const { run, entity, notes } = await load();
    entity.clearEntity();
    entity.setPhase('hablando');
    entity.markLeft('vuelta');

    const salida = run(`//${notes.GIFT_WORD}`, ctx())!;

    expect(salida.effect).toEqual({ kind: 'none' });
    expect(salida.output).not.toMatch(/PIEZA|PIECE/);
});
