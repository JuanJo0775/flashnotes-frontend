// tests/hooks/useReset.test.ts

/**
 * `//reset` · empezar de cero.
 *
 * Lo que importa de esta pieza no es que borre: es QUÉ NO borra. Un comando
 * escondido que se lleve por delante lo que escribiste no es un huevo de pascua,
 * es una pérdida de datos.
 */
async function load() {
    jest.resetModules();
    const [system, art, scores, cmds, morse, drift] = await Promise.all([
        import('@/hooks/useSystemState'),
        import('@/lib/system/asciiArt'),
        import('@/lib/system/pongScores'),
        import('@/lib/system/commandUnlock'),
        import('@/lib/system/morse'),
        import('@/lib/system/timeDrift'),
    ]);
    return { system, art, scores, cmds, morse, drift };
}

beforeEach(() => localStorage.clear());

describe('//reset · lo deja todo como la primera vez', () => {
    test('olvida los secretos encontrados', async () => {
        const { system } = await load();
        system.markSecretFound('commands');
        expect(system.getSystemState().secretsFound).toBeGreaterThan(0);

        system.resetEverything();

        expect(system.getSystemState().secretsFound).toBe(0);
    });

    test('olvida las piezas de arte', async () => {
        const { system, art } = await load();
        art.drawArt(() => 0);
        expect(art.readFound().size).toBe(1);

        system.resetEverything();

        expect(art.readFound().size).toBe(0);
    });

    test('olvida los marcadores del pong', async () => {
        const { system, scores } = await load();
        scores.recordRally('clean', 42);
        expect(scores.readScores().clean.best).toBe(42);

        system.resetEverything();

        expect(scores.readScores().clean.best).toBe(0);
    });

    test('vuelve a tachar los comandos desbloqueados', async () => {
        const { system, cmds } = await load();
        cmds.markUsed('//panic');
        expect(cmds.isUnlocked('//panic')).toBe(true);

        system.resetEverything();

        expect(cmds.isUnlocked('//panic')).toBe(false);
    });

    test('sortea otra palabra en morse', async () => {
        const { system, morse } = await load();
        morse.sessionWord(() => 0);

        system.resetEverything();

        expect(morse.sessionWord(() => 0.99)).not.toBe(morse.WORDS[0]);
    });

    test('devuelve la cordura al reloj', async () => {
        const { system, drift } = await load();
        drift.startDrift(Date.now());
        expect(drift.isDrifting()).toBe(true);

        system.resetEverything();

        expect(drift.isDrifting()).toBe(false);
    });

    test('levanta el bloqueo', async () => {
        const { system } = await load();
        for (let i = 0; i < system.LOCKOUT_AT; i += 1) system.registerCollapse();
        expect(system.getSystemState().lockedOut).toBe(true);

        system.resetEverything();

        expect(system.getSystemState().lockedOut).toBe(false);
    });

    test('devuelve la integridad a 100', async () => {
        const { system } = await load();
        system.registerCollapse();

        system.resetEverything();

        expect(system.getSystemState().integrity).toBe(100);
    });
});

describe('//reset · lo que NO toca', () => {
    test('no borra nada de las notas', async () => {
        // Reiniciar el juego no es reiniciar tu trabajo. Las notas viven en el
        // backend y este comando no habla con él: la garantía es que no hay
        // ninguna llamada de red que borrar.
        const { system } = await load();
        localStorage.setItem('algo-que-no-es-del-juego', 'intacto');

        system.resetEverything();

        expect(localStorage.getItem('algo-que-no-es-del-juego')).toBe('intacto');
    });

    test('respeta si apagaste los efectos', async () => {
        // Es una preferencia tuya, no una parte del juego que se gane.
        const { system } = await load();
        system.setEffectsEnabled(false);

        system.resetEverything();

        expect(system.getSystemState().effectsEnabled).toBe(false);
    });
});
