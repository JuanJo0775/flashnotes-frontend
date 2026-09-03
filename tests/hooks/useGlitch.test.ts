// tests/hooks/useGlitch.test.ts
export {};

async function fresh() {
    jest.resetModules();
    const [glitch, system, fragment] = await Promise.all([
        import('@/hooks/useGlitch'),
        import('@/hooks/useSystemState'),
        import('@/hooks/useSystemFragment'),
    ]);
    return { ...glitch, system, fragment };
}

beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('useGlitch - disparar un fallo', () => {
    test('en reposo no hay glitch', async () => {
        const { getGlitch } = await fresh();

        expect(getGlitch().active).toBe(false);
    });

    test('dispararlo lo activa', async () => {
        const { fireGlitch, getGlitch } = await fresh();

        fireGlitch(() => 0.9);

        expect(getGlitch().active).toBe(true);
    });

    test('se apaga solo', async () => {
        const { fireGlitch, getGlitch } = await fresh();

        // Cada nivel dura lo suyo; medio segundo cubre hasta el más grave.
        fireGlitch(() => 0.9);
        jest.advanceTimersByTime(600);

        expect(getGlitch().active).toBe(false);
    });

    test('un fallo grave dura más que uno leve', async () => {
        // No es capricho: con 180 ms las rebanadas de un fallo grave apenas se
        // llegan a ver.
        const { fireGlitch, getGlitch } = await fresh();

        fireGlitch(() => 0.5); // leve
        jest.advanceTimersByTime(200);
        expect(getGlitch().active).toBe(false);

        fireGlitch(() => 0.99); // grave
        jest.advanceTimersByTime(200);
        expect(getGlitch().active).toBe(true);
    });

    test('con el sistema sano tiembla lo justo', async () => {
        const { fireGlitch, getGlitch } = await fresh();

        fireGlitch(() => 0.9);

        expect(getGlitch().amplitudePx).toBe(3);
    });

    test('con la integridad baja tiembla más', async () => {
        const { fireGlitch, getGlitch, system, GLITCH_MS } = await fresh();

        fireGlitch(() => 0.9);
        const sano = getGlitch().amplitudePx;
        jest.advanceTimersByTime(GLITCH_MS + 50);

        for (let i = 0; i < 6; i += 1) system.registerLogoClick();
        fireGlitch(() => 0.9);

        expect(getGlitch().amplitudePx).toBeGreaterThan(sano);
    });

    test('avisa a quien esté suscrito', async () => {
        const { subscribe, fireGlitch } = await fresh();
        const escucha = jest.fn();

        const baja = subscribe(escucha);
        fireGlitch(() => 0.9);
        baja();

        expect(escucha).toHaveBeenCalled();
    });
});

describe('useGlitch - el negativo', () => {
    test('casi siempre el glitch va sin negativo', async () => {
        const { fireGlitch, getGlitch } = await fresh();

        fireGlitch(() => 0.9);

        expect(getGlitch().negative).toBe(false);
    });

    test('un fallo leve nunca invierte la pantalla', async () => {
        // Invertir la pantalla entera por un parpadeo es desproporcionado, y lo
        // desproporcionado delata el truco.
        const { fireGlitch, getGlitch } = await fresh();

        fireGlitch(() => 0);

        expect(getGlitch().severity).toBe('minor');
        expect(getGlitch().negative).toBe(false);
    });
});

describe('useGlitch - los niveles de gravedad', () => {
    test('un fallo leve no rebana la pantalla', async () => {
        const { fireGlitch, getGlitch } = await fresh();

        fireGlitch(() => 0.5);

        expect(getGlitch().severity).toBe('minor');
        expect(getGlitch().slices).toHaveLength(0);
    });

    test('uno serio la parte en franjas desplazadas', async () => {
        const { fireGlitch, getGlitch } = await fresh();

        fireGlitch(() => 0.8);

        expect(getGlitch().severity).toBe('major');
        expect(getGlitch().slices.length).toBeGreaterThan(0);
    });

    test('uno grave la parte en más franjas todavía', async () => {
        const { fireGlitch, getGlitch, GLITCH_MS } = await fresh();

        fireGlitch(() => 0.8);
        const serias = getGlitch().slices.length;
        jest.advanceTimersByTime(GLITCH_MS + 500);

        fireGlitch(() => 0.99);

        expect(getGlitch().slices.length).toBeGreaterThan(serias);
    });
});

describe('useGlitch - el acoplamiento con los fragmentos', () => {
    // Un fallo suelto es ruido; un fallo que ocurre justo cuando el sistema dice
    // algo es una frase. Este acoplamiento es el mecanismo central del lore.
    test('una de cada cinco veces, el sistema además dice algo', async () => {
        const { fireGlitch, fragment, FRAGMENT_DELAY_MS } = await fresh();

        fireGlitch(() => 0);
        jest.advanceTimersByTime(FRAGMENT_DELAY_MS + 20);

        expect(fragment.getFragment()).not.toBeNull();
    });

    test('el fragmento llega con retraso, para que el ojo alcance', async () => {
        const { fireGlitch, fragment } = await fresh();

        fireGlitch(() => 0);

        expect(fragment.getFragment()).toBeNull();
    });

    test('la mayoría de las veces el fallo va callado', async () => {
        const { fireGlitch, fragment, FRAGMENT_DELAY_MS } = await fresh();

        fireGlitch(() => 0.9);
        jest.advanceTimersByTime(FRAGMENT_DELAY_MS + 20);

        expect(fragment.getFragment()).toBeNull();
    });
});

describe('useGlitch - cuándo no se dispara', () => {
    test('con los efectos apagados no pasa nada', async () => {
        const { fireGlitch, getGlitch, system } = await fresh();

        system.setEffectsEnabled(false);
        fireGlitch(() => 0.9);

        expect(getGlitch().active).toBe(false);
    });

    test('con la señal rota, los fallos NO se apagan: suben de nivel', async () => {
        // Bloquearlos durante la avería era al revés de lo que hacía falta: una
        // pantalla ya rota que además deja de dar tirones se ve extrañamente
        // estable. Lo que sería leve pasa a serio, y lo serio a grave.
        const { fireGlitch, getGlitch, system, GLITCH_MS } = await fresh();

        fireGlitch(() => 0.5);
        expect(getGlitch().severity).toBe('minor');
        jest.advanceTimersByTime(GLITCH_MS + 500);

        for (let i = 0; i < system.THEME_BREAK_AT; i += 1) system.registerThemeToggle();
        fireGlitch(() => 0.5);

        expect(getGlitch().active).toBe(true);
        expect(getGlitch().severity).toBe('major');
    });

    test('con la señal rota, un fallo serio pasa a grave', async () => {
        const { fireGlitch, getGlitch, system } = await fresh();

        for (let i = 0; i < system.THEME_BREAK_AT; i += 1) system.registerThemeToggle();
        fireGlitch(() => 0.8);

        expect(getGlitch().severity).toBe('severe');
    });
});

describe('useGlitch - con la señal rota nunca hay fallos leves', () => {
    // Un parpadeo suave sobre una pantalla ya averiada no se nota. Lo mínimo
    // pasa a ser `major`, que es el nivel del clic 7 del rótulo: rebanadas,
    // fantasma y caída de nivel.
    test('el nivel mínimo sube a serio', async () => {
        const { fireGlitch, getGlitch, system } = await fresh();

        for (let i = 0; i < system.THEME_BREAK_AT; i += 1) system.registerThemeToggle();

        for (const azar of [0, 0.3, 0.5, 0.69]) {
            fireGlitch(() => azar);
            expect(getGlitch().severity).not.toBe('minor');
            jest.advanceTimersByTime(1000);
        }
    });

    test('y siempre trae rebanadas, que es lo que se ve', async () => {
        const { fireGlitch, getGlitch, system } = await fresh();

        for (let i = 0; i < system.THEME_BREAK_AT; i += 1) system.registerThemeToggle();
        fireGlitch(() => 0.5);

        expect(getGlitch().slices.length).toBeGreaterThan(0);
    });

    test('el nivel forzado del botón también escala con la señal rota', async () => {
        const { fireGlitch, getGlitch, system } = await fresh();

        for (let i = 0; i < system.THEME_BREAK_AT; i += 1) system.registerThemeToggle();
        // El clic 7 pide `major`; con la señal rota tiene que llegar a `severe`.
        fireGlitch(Math.random, 'major');

        expect(getGlitch().severity).toBe('severe');
    });
});

describe('useGlitch - la ráfaga cromática', () => {
    /**
     * `fireGlitch` pide azar varias veces seguidas: gravedad, negativo,
     * rebanadas y por último la ráfaga. Un valor fijo no puede a la vez dar
     * `severe` (hace falta > 0,95) y pasar la tirada de la ráfaga (< 0,5), así
     * que se le da una secuencia y el resto se rellena con un valor neutro.
     */
    const secuencia = (...valores: number[]) => {
        let i = 0;
        return () => valores[i++] ?? 0.4;
    };

    // El botón secreto y el fallo del tema son la misma familia: los dos son
    // pánico. Que el botón dispare a veces la MISMA aberración —transitoria, sin
    // romper nada— es lo que los emparenta en vez de dejarlos como dos efectos
    // sueltos que casualmente conviven.
    test('en reposo no hay ráfaga', async () => {
        const { getGlitch } = await fresh();

        expect(getGlitch().chromaBurst).toBe(false);
    });

    test('un fallo leve nunca la trae', async () => {
        const { fireGlitch, getGlitch } = await fresh();

        fireGlitch(() => 0.5);

        expect(getGlitch().severity).toBe('minor');
        expect(getGlitch().chromaBurst).toBe(false);
    });

    test('un fallo grave la trae de vez en cuando', async () => {
        const { fireGlitch, getGlitch } = await fresh();

        fireGlitch(secuencia(0.99));

        expect(getGlitch().severity).toBe('severe');
        expect(getGlitch().chromaBurst).toBe(true);
    });

    test('pero no siempre: es una de cada dos', async () => {
        const { fireGlitch, getGlitch } = await fresh();

        // Gravedad grave, y la última tirada por encima del umbral.
        fireGlitch(secuencia(0.99, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9,
            0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9,
            0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9,
            0.9, 0.9, 0.9, 0.9, 0.9));

        expect(getGlitch().chromaBurst).toBe(false);
    });

    test('se apaga con el resto del fallo', async () => {
        const { fireGlitch, getGlitch } = await fresh();

        fireGlitch(secuencia(0.99));
        jest.advanceTimersByTime(600);

        expect(getGlitch().chromaBurst).toBe(false);
    });

    test('con la señal ya rota no se pide otra ráfaga encima', async () => {
        // Ya hay aberración permanente: una transitoria encima no se vería y
        // sólo costaría repintados.
        const { fireGlitch, getGlitch, system } = await fresh();

        for (let i = 0; i < system.THEME_BREAK_AT; i += 1) system.registerThemeToggle();
        fireGlitch(secuencia(0.99));

        expect(getGlitch().chromaBurst).toBe(false);
    });
});
