// tests/hooks/useSystemState.test.ts

// Sin ningún `import`/`export` estático, TypeScript trata este archivo como un
// script global y su `freshStore` choca con el de otro test. Esto lo declara
// módulo, que es lo que evita la colisión.
export {};

/**
 * El almacén es de módulo, así que su estado sobrevive entre tests. En vez de
 * abrirle una puerta de reinicio que sólo usarían las pruebas, cada test carga
 * el módulo de cero: es exactamente lo que pasa al recargar la pestaña, que es
 * el escenario que además hay que comprobar.
 */
async function freshStore() {
    jest.resetModules();
    return import('@/hooks/useSystemState');
}

beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('useSystemState - integridad', () => {
    test('arranca con el sistema sano', async () => {
        const { getSystemState } = await freshStore();

        expect(getSystemState().integrity).toBe(100);
    });

    test('los primeros clics en el logo no hacen nada visible', async () => {
        const { registerLogoClick, getSystemState } = await freshStore();

        expect(registerLogoClick()).toEqual({ kind: 'none' });
        expect(registerLogoClick()).toEqual({ kind: 'none' });
        expect(getSystemState().integrity).toBe(100);
    });

    test('el tercer clic asoma la versión, que es la única invitación', async () => {
        const { registerLogoClick } = await freshStore();

        registerLogoClick();
        registerLogoClick();

        expect(registerLogoClick()).toEqual({ kind: 'version-flicker' });
    });

    test('el quinto clic baja la integridad a 80', async () => {
        const { registerLogoClick, getSystemState } = await freshStore();

        for (let i = 0; i < 4; i += 1) registerLogoClick();
        const resultado = registerLogoClick();

        expect(resultado).toMatchObject({ kind: 'integrity', value: 80 });
        expect(getSystemState().integrity).toBe(80);
    });

    test('la integridad baja escalón a escalón hasta el colapso', async () => {
        const { registerLogoClick } = await freshStore();

        for (let i = 0; i < 4; i += 1) registerLogoClick();

        expect(registerLogoClick()).toMatchObject({ value: 80 });
        expect(registerLogoClick()).toMatchObject({ value: 60 });
        expect(registerLogoClick()).toMatchObject({ value: 40 });
        expect(registerLogoClick()).toMatchObject({ value: 20 });
        expect(registerLogoClick()).toEqual({ kind: 'collapse' });
    });

    test('el glitch crece a medida que el sistema se rompe', async () => {
        const { registerLogoClick } = await freshStore();

        for (let i = 0; i < 4; i += 1) registerLogoClick();

        const a = registerLogoClick() as { glitchPx: number };
        const b = registerLogoClick() as { glitchPx: number };

        expect(b.glitchPx).toBeGreaterThan(a.glitchPx);
    });
});

describe('useSystemState - el reinicio que evita el accidente', () => {
    // Sin esto, dos clics accidentales separados por días acabarían rompiéndole
    // el sistema a alguien que sólo quería escribir.
    test('a los 4 segundos sin clics el contador vuelve a cero', async () => {
        const { registerLogoClick } = await freshStore();

        for (let i = 0; i < 4; i += 1) registerLogoClick();
        jest.advanceTimersByTime(4000);

        // Si el contador no se hubiera reiniciado, este sería el quinto clic.
        expect(registerLogoClick()).toEqual({ kind: 'none' });
    });

    test('el reinicio devuelve el sistema a sano', async () => {
        const { registerLogoClick, getSystemState } = await freshStore();

        for (let i = 0; i < 5; i += 1) registerLogoClick();
        expect(getSystemState().integrity).toBe(80);

        jest.advanceTimersByTime(4000);

        expect(getSystemState().integrity).toBe(100);
    });

    test('seguir haciendo clic mantiene vivo el contador', async () => {
        const { registerLogoClick } = await freshStore();

        for (let i = 0; i < 4; i += 1) {
            registerLogoClick();
            jest.advanceTimersByTime(3000);
        }

        expect(registerLogoClick()).toMatchObject({ value: 80 });
    });

    test('la integridad no se recuerda entre sesiones', async () => {
        const primera = await freshStore();
        for (let i = 0; i < 5; i += 1) primera.registerLogoClick();
        expect(primera.getSystemState().integrity).toBe(80);

        const segunda = await freshStore();

        expect(segunda.getSystemState().integrity).toBe(100);
    });
});

describe('useSystemState - el interruptor de efectos', () => {
    test('los efectos vienen encendidos', async () => {
        const { getSystemState } = await freshStore();

        expect(getSystemState().effectsEnabled).toBe(true);
    });

    test('apagarlos se recuerda al recargar', async () => {
        const primera = await freshStore();
        primera.setEffectsEnabled(false);

        const segunda = await freshStore();

        expect(segunda.getSystemState().effectsEnabled).toBe(false);
    });

    test('volver a encenderlos también se recuerda', async () => {
        const primera = await freshStore();
        primera.setEffectsEnabled(false);
        primera.setEffectsEnabled(true);

        const segunda = await freshStore();

        expect(segunda.getSystemState().effectsEnabled).toBe(true);
    });
});

describe('useSystemState - secretos hallados', () => {
    test('se empieza sin ninguno', async () => {
        const { getSystemState } = await freshStore();

        expect(getSystemState().secretsFound).toBe(0);
    });

    test('marcar uno lo cuenta', async () => {
        const { markSecretFound, getSystemState } = await freshStore();

        markSecretFound('sudo');

        expect(getSystemState().secretsFound).toBe(1);
    });

    test('el mismo secreto dos veces sigue siendo uno', async () => {
        const { markSecretFound, getSystemState } = await freshStore();

        markSecretFound('sudo');
        markSecretFound('sudo');

        expect(getSystemState().secretsFound).toBe(1);
    });

    test('los hallazgos sobreviven a la recarga', async () => {
        const primera = await freshStore();
        primera.markSecretFound('sudo');
        primera.markSecretFound('diagnostics');

        const segunda = await freshStore();

        expect(segunda.getSystemState().secretsFound).toBe(2);
    });

    test('un identificador que no está en el registro no se cuenta', async () => {
        const { markSecretFound, getSystemState } = await freshStore();

        markSecretFound('no-existe');

        expect(getSystemState().secretsFound).toBe(0);
    });

    test('el total sale del registro, no de un número escrito a mano', async () => {
        const { getSystemState, SECRET_IDS } = await freshStore();

        expect(getSystemState().secretsTotal).toBe(SECRET_IDS.length);
    });
});

describe('useSystemState - avisa a quien esté suscrito', () => {
    test('un cambio notifica a los suscriptores', async () => {
        const { subscribe, markSecretFound } = await freshStore();
        const escucha = jest.fn();

        const desuscribir = subscribe(escucha);
        markSecretFound('sudo');
        desuscribir();

        expect(escucha).toHaveBeenCalled();
    });

    test('deja de avisar a quien se dio de baja', async () => {
        const { subscribe, markSecretFound } = await freshStore();
        const escucha = jest.fn();

        subscribe(escucha)();
        markSecretFound('sudo');

        expect(escucha).not.toHaveBeenCalled();
    });

    test('un cambio que no cambia nada no despierta a nadie', async () => {
        const { subscribe, markSecretFound } = await freshStore();
        markSecretFound('sudo');

        const escucha = jest.fn();
        const desuscribir = subscribe(escucha);
        markSecretFound('sudo');
        desuscribir();

        expect(escucha).not.toHaveBeenCalled();
    });
});

describe('useSystemState - almacenamiento bloqueado', () => {
    // Ventana privada o almacenamiento denegado: la app tiene que seguir
    // funcionando, igual que hace useTheme.
    test('no explota si localStorage tira', async () => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = () => {
            throw new Error('denegado');
        };

        try {
            const { setEffectsEnabled, getSystemState } = await freshStore();

            expect(() => setEffectsEnabled(false)).not.toThrow();
            expect(getSystemState().effectsEnabled).toBe(false);
        } finally {
            Storage.prototype.setItem = original;
        }
    });
});

describe('useSystemState - la papelera lleva la cuenta', () => {
    test('se empieza sin bajas', async () => {
        const { getSystemState } = await freshStore();

        expect(getSystemState().permanentDeletes).toBe(0);
    });

    test('cada borrado definitivo suma', async () => {
        const { registerPermanentDelete, getSystemState } = await freshStore();

        registerPermanentDelete();
        registerPermanentDelete();

        expect(getSystemState().permanentDeletes).toBe(2);
    });

    test('la cuenta muere con la sesión: no se recuerda', async () => {
        const primera = await freshStore();
        primera.registerPermanentDelete();

        const segunda = await freshStore();

        expect(segunda.getSystemState().permanentDeletes).toBe(0);
    });

    test('al quinto borrado queda marcado el secreto', async () => {
        const { registerPermanentDelete, getSystemState } = await freshStore();

        for (let i = 0; i < 4; i += 1) registerPermanentDelete();
        expect(getSystemState().secretsFound).toBe(0);

        registerPermanentDelete();

        expect(getSystemState().secretsFound).toBe(1);
    });
});

describe('useSystemState - cuándo se tiró la última nota', () => {
    test('al empezar no hay ninguna', async () => {
        const { getSystemState } = await freshStore();

        expect(getSystemState().noteTrashedAt).toBeNull();
    });

    test('mandar una a la papelera deja el instante anotado', async () => {
        const { markNoteTrashed, getSystemState } = await freshStore();

        markNoteTrashed();

        expect(getSystemState().noteTrashedAt).toBeCloseTo(Date.now(), -2);
    });
});

describe('useSystemState - el fallo cromático', () => {
    test('el sistema arranca sin fallo de señal', async () => {
        const { getSystemState } = await freshStore();

        expect(getSystemState().chromaticFailure).toBe(false);
    });

    test('cambiar de tema un par de veces no rompe nada', async () => {
        const { registerThemeToggle, getSystemState } = await freshStore();

        registerThemeToggle();
        registerThemeToggle();

        expect(getSystemState().chromaticFailure).toBe(false);
    });

    test('insistir rompe la señal', async () => {
        const { registerThemeToggle, getSystemState, THEME_BREAK_AT } =
            await freshStore();

        for (let i = 0; i < THEME_BREAK_AT; i += 1) registerThemeToggle();

        expect(getSystemState().chromaticFailure).toBe(true);
    });

    test('avisa en el momento exacto en que se rompe', async () => {
        const { registerThemeToggle, THEME_BREAK_AT } = await freshStore();

        for (let i = 0; i < THEME_BREAK_AT - 1; i += 1) {
            expect(registerThemeToggle()).toBe(false);
        }

        expect(registerThemeToggle()).toBe(true);
    });

    test('con pausas entre pulsaciones no se rompe: hay que insistir', async () => {
        const { registerThemeToggle, getSystemState, THEME_BREAK_AT } =
            await freshStore();

        for (let i = 0; i < THEME_BREAK_AT + 3; i += 1) {
            registerThemeToggle();
            jest.advanceTimersByTime(3000);
        }

        expect(getSystemState().chromaticFailure).toBe(false);
    });

    test('una vez roto, no se arregla solo', async () => {
        const { registerThemeToggle, getSystemState, THEME_BREAK_AT } =
            await freshStore();

        for (let i = 0; i < THEME_BREAK_AT; i += 1) registerThemeToggle();
        jest.advanceTimersByTime(600_000);

        expect(getSystemState().chromaticFailure).toBe(true);
    });

    test('roto, el interruptor deja de responder', async () => {
        const { registerThemeToggle, THEME_BREAK_AT } = await freshStore();

        for (let i = 0; i < THEME_BREAK_AT; i += 1) registerThemeToggle();

        expect(registerThemeToggle()).toBe(false);
    });

    test('recargar devuelve la señal limpia', async () => {
        const primera = await freshStore();
        for (let i = 0; i < primera.THEME_BREAK_AT; i += 1) primera.registerThemeToggle();

        const segunda = await freshStore();

        expect(segunda.getSystemState().chromaticFailure).toBe(false);
    });

    test('romperlo cuenta como secreto encontrado', async () => {
        const { registerThemeToggle, getSystemState, THEME_BREAK_AT } =
            await freshStore();

        for (let i = 0; i < THEME_BREAK_AT; i += 1) registerThemeToggle();

        expect(getSystemState().secretsFound).toBe(1);
    });
});

describe('useSystemState - la escalada del colapso', () => {
    test('el primer colapso es el nivel uno', async () => {
        const { registerCollapse } = await freshStore();

        expect(registerCollapse().intensity).toBe(1);
    });

    test('las primeras dos veces se reproducen igual', async () => {
        const { registerCollapse } = await freshStore();

        for (let i = 0; i < 2; i += 1) {
            expect(registerCollapse().intensity).toBe(1);
        }
    });

    test('insistiendo, los fallos se vuelven más fuertes', async () => {
        const { registerCollapse } = await freshStore();

        registerCollapse();
        registerCollapse();

        expect(registerCollapse().intensity).toBeGreaterThan(1);
    });

    test('la ventana corre desde que el sistema SE RECUPERÓ', async () => {
        // Los rearranques ocurren dentro de la ventana: si se contaran, la
        // racha se cortaría por lo que tarda la máquina en volver, no por lo
        // que tardaste vos en romperla otra vez.
        const { registerCollapse, registerRecovery, ESCALATION_WINDOW_MS } =
            await freshStore();

        registerCollapse();
        // Un rearranque largo: casi toda la ventana.
        jest.advanceTimersByTime(ESCALATION_WINDOW_MS - 1000);
        registerRecovery();
        // Y ahora se rompe de nuevo enseguida: la racha tiene que seguir viva.
        jest.advanceTimersByTime(2000);

        expect(registerCollapse().intensity).toBe(1);
        expect(registerCollapse().intensity).toBeGreaterThan(1);
    });

    test('dejar pasar la ventana corta la racha', async () => {
        const { registerCollapse, ESCALATION_WINDOW_MS } = await freshStore();

        for (let i = 0; i < 6; i += 1) registerCollapse();
        jest.advanceTimersByTime(ESCALATION_WINDOW_MS + 1000);

        expect(registerCollapse().intensity).toBe(1);
    });
});

describe('useSystemState - el bloqueo', () => {
    test('se empieza sin bloqueo', async () => {
        const { getSystemState } = await freshStore();

        expect(getSystemState().lockedOut).toBe(false);
    });

    test('al llegar al umbral, el sistema se bloquea', async () => {
        const { registerCollapse, getSystemState, LOCKOUT_AT } = await freshStore();

        for (let i = 0; i < LOCKOUT_AT; i += 1) registerCollapse();

        expect(getSystemState().lockedOut).toBe(true);
    });

    test('el bloqueo SOBREVIVE a la recarga', async () => {
        // Es lo único de toda la app que sobrevive a recargar: recargar es la
        // salida fácil de todo lo demás, y acá justamente no la hay.
        const primera = await freshStore();
        for (let i = 0; i < primera.LOCKOUT_AT; i += 1) primera.registerCollapse();

        const segunda = await freshStore();

        expect(segunda.getSystemState().lockedOut).toBe(true);
    });

    test('resolverlo lo levanta, y no vuelve al recargar', async () => {
        const primera = await freshStore();
        for (let i = 0; i < primera.LOCKOUT_AT; i += 1) primera.registerCollapse();
        primera.clearLockout();
        expect(primera.getSystemState().lockedOut).toBe(false);

        const segunda = await freshStore();

        expect(segunda.getSystemState().lockedOut).toBe(false);
    });

    test('a los cinco minutos se levanta solo', async () => {
        const { registerCollapse, getSystemState, LOCKOUT_AT, LOCKOUT_MS } =
            await freshStore();

        for (let i = 0; i < LOCKOUT_AT; i += 1) registerCollapse();
        jest.advanceTimersByTime(LOCKOUT_MS + 1000);

        expect(getSystemState().lockedOut).toBe(false);
    });

    test('un bloqueo ya vencido no revive al recargar', async () => {
        const primera = await freshStore();
        for (let i = 0; i < primera.LOCKOUT_AT; i += 1) primera.registerCollapse();
        jest.advanceTimersByTime(primera.LOCKOUT_MS + 1000);

        const segunda = await freshStore();

        expect(segunda.getSystemState().lockedOut).toBe(false);
    });

    test('la cuenta de colapsos se olvida al recargar; el bloqueo no', async () => {
        const primera = await freshStore();
        for (let i = 0; i < 5; i += 1) primera.registerCollapse();

        const segunda = await freshStore();

        expect(segunda.registerCollapse().intensity).toBe(1);
    });
});

describe('useSystemState - la combinación crítica', () => {
    // Dos averías a la vez SON la condición crítica. Pedirle además que repita
    // el colapso cinco veces más sería contar dos veces lo mismo.
    test('romper el sistema con la señal ya rota va directo al bloqueo', async () => {
        const { registerThemeToggle, registerCollapse, getSystemState, THEME_BREAK_AT } =
            await freshStore();

        for (let i = 0; i < THEME_BREAK_AT; i += 1) registerThemeToggle();
        const nivel = registerCollapse();

        expect(nivel.lockout).toBe(true);
        expect(getSystemState().lockedOut).toBe(true);
    });

    test('con la señal sana, el primer colapso sigue siendo inofensivo', async () => {
        const { registerCollapse, getSystemState } = await freshStore();

        expect(registerCollapse().lockout).toBe(false);
        expect(getSystemState().lockedOut).toBe(false);
    });
});

describe('useSystemState - las ventanas sobreviven al bloqueo', () => {
    test('lo guardado vuelve al leerlo', async () => {
        const { storePhantoms, readStoredPhantoms } = await freshStore();

        storePhantoms([
            { id: 1, code: '0x00C4', text: 'ALGO', topPct: 10, leftPct: 20 },
        ]);

        expect(readStoredPhantoms()).toHaveLength(1);
        expect(readStoredPhantoms()[0].code).toBe('0x00C4');
    });

    test('sobreviven a la recarga', async () => {
        const primera = await freshStore();
        primera.storePhantoms([
            { id: 1, code: '0x1F3A', text: 'ALGO', topPct: 10, leftPct: 20 },
        ]);

        const segunda = await freshStore();

        expect(segunda.readStoredPhantoms()).toHaveLength(1);
    });

    test('resolver el puzzle se las lleva: son parte del bloqueo', async () => {
        const { storePhantoms, readStoredPhantoms, clearLockout, registerCollapse, LOCKOUT_AT } =
            await freshStore();

        for (let i = 0; i < LOCKOUT_AT; i += 1) registerCollapse();
        storePhantoms([
            { id: 1, code: '0x2B08', text: 'ALGO', topPct: 10, leftPct: 20 },
        ]);

        clearLockout();

        expect(readStoredPhantoms()).toHaveLength(0);
    });

    test('basura en el almacenamiento no rompe nada', async () => {
        const { readStoredPhantoms } = await freshStore();
        localStorage.setItem('flashnotes:phantoms', 'no soy json');

        expect(readStoredPhantoms()).toEqual([]);
    });
});
