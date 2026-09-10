// tests/components/effects/CollectionCeremony.test.tsx
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

/**
 * LA DIECISÉIS SE VE UNA VEZ, Y SÓLO AL CRUZAR.
 *
 * ⚠ LO QUE DE VERDAD SE VIGILA ACÁ ES EL DISPARO, no el dibujo. La ceremonia
 * cuelga del almacén de pistas, que avisa cada vez que ganás, revelás o abrís
 * algo: preguntar sólo «¿hay dieciséis?» la haría saltar en CADA aviso de una
 * partida ya completa — una pantalla que baja el nivel cada dos por tres, para
 * siempre. Lo que se celebra es el cruce, y ocurre una vez.
 */

/** Todas las piezas menos una, para dejar la partida a un paso del final. */
async function casiTodas(arte: typeof import('@/lib/system/asciiArt')) {
    const ids = arte.ART.map((p) => p.id);
    for (const id of ids.slice(0, ids.length - 1)) arte.awardPiece(id);
    return ids[ids.length - 1];
}

async function load(reduce = false) {
    jest.resetModules();

    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: reduce && query.includes('prefers-reduced-motion'),
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        }),
    });

    const [efecto, arte, pistas, tiempos, system, rtl] = await Promise.all([
        import('@/components/effects/CollectionCeremony'),
        import('@/lib/system/asciiArt'),
        import('@/lib/system/artHints'),
        import('@/lib/system/ceremonia'),
        import('@/hooks/useSystemState'),
        import('@testing-library/react'),
    ]);

    return {
        Ceremonia: efecto.default,
        arte,
        pistas,
        system,
        ...tiempos,
        ...rtl,
    };
}

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    document.body.className = '';
    jest.useFakeTimers();
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
});

describe('la dieciséis · cuándo se ve', () => {
    test('con la colección a medias no pinta nada', async () => {
        const { Ceremonia, arte, render, act, CEREMONIA_ESPERA_MS } = await load();
        const { container } = render(<Ceremonia />);

        act(() => {
            arte.awardPiece(arte.ART[0].id);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + 100);
        });

        expect(container.querySelector('.ceremonia-nivel')).toBeNull();
    });

    test('al caer la última, el nivel baja', async () => {
        const { Ceremonia, arte, render, act, CEREMONIA_ESPERA_MS } = await load();
        const ultima = await casiTodas(arte);

        const { container } = render(<Ceremonia />);
        act(() => {
            arte.awardPiece(ultima);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + 20);
        });

        expect(container.querySelector('.ceremonia-nivel')).not.toBeNull();
    });

    test('⚠ y no antes de la espera: primero suena el cajón', async () => {
        const { Ceremonia, arte, render, act, CEREMONIA_ESPERA_MS } = await load();
        const ultima = await casiTodas(arte);

        const { container } = render(<Ceremonia />);
        act(() => {
            arte.awardPiece(ultima);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS - 40);
        });

        expect(container.querySelector('.ceremonia-nivel')).toBeNull();
    });

    test('y se retira sola', async () => {
        const { Ceremonia, arte, render, act, CEREMONIA_ESPERA_MS, CEREMONIA_MS } =
            await load();
        const ultima = await casiTodas(arte);

        const { container } = render(<Ceremonia />);
        act(() => {
            arte.awardPiece(ultima);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + CEREMONIA_MS + 100);
        });

        expect(container.querySelector('.ceremonia-nivel')).toBeNull();
    });

    test('⚠ con la colección YA completa no vuelve a saltar', async () => {
        /*
         * El almacén de pistas avisa cada vez que ganás, revelás o abrís algo.
         * Sin la condición del cruce, una partida terminada bajaría el nivel en
         * cada uno de esos avisos, para siempre.
         */
        const { Ceremonia, arte, pistas, render, act, CEREMONIA_ESPERA_MS } = await load();
        const ultima = await casiTodas(arte);
        arte.awardPiece(ultima);

        const { container } = render(<Ceremonia />);
        act(() => {
            pistas.bragEarned();
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + 100);
        });

        expect(container.querySelector('.ceremonia-nivel')).toBeNull();
    });
});

describe('la dieciséis · a quién respeta', () => {
    test('con los efectos apagados no hay ceremonia', async () => {
        const { Ceremonia, arte, system, render, act, CEREMONIA_ESPERA_MS } = await load();
        system.setEffectsEnabled(false);
        const ultima = await casiTodas(arte);

        const { container } = render(<Ceremonia />);
        act(() => {
            arte.awardPiece(ultima);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + 100);
        });

        expect(container.querySelector('.ceremonia-nivel')).toBeNull();
    });

    test('⚠ con prefers-reduced-motion se ve exactamente lo mismo', async () => {
        /*
         * Y no es que la regla se ignore: es que acá NO SE MUEVE NADA. El nivel
         * entra y sale de golpe, como todos los cambios de estado de esta app,
         * así que este momento cumple A3 por construcción y no por una
         * excepción — quien la tiene puesta ve lo mismo que todo el mundo.
         */
        const { Ceremonia, arte, render, act, CEREMONIA_ESPERA_MS } = await load(true);
        const ultima = await casiTodas(arte);

        const { container } = render(<Ceremonia />);
        act(() => {
            arte.awardPiece(ultima);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + 20);
        });

        expect(container.querySelector('.ceremonia-nivel')).not.toBeNull();
    });
});

describe('la dieciséis · el barrido no se toca', () => {
    test('⚠ no dibuja una línea propia ni le pone clases a la de siempre', async () => {
        /*
         * LA PRIMERA VERSIÓN DE ESTE MOMENTO LLEVABA UNA: una pasada única, más
         * gruesa, más clara y más lenta, con la de siempre apartada mientras
         * duraba. La tumbó `scanlineAlways`, que lleva ahí desde antes y ya
         * había echado a una versión «especial» del barrido para el arranque y
         * el colapso:
         *
         *   EL BARRIDO ES EL REFRESCO DEL TUBO, Y UN TUBO NO REFRESCA DISTINTO
         *   SEGÚN LO QUE ESTÉ PINTANDO.
         *
         * Este test es el recordatorio del lado del componente: el de siempre
         * sigue bajando, intacto, y acaba siendo lo único que se mueve en una
         * pantalla apagada un punto — que era justo lo que la línea nueva
         * quería conseguir.
         */
        const { Ceremonia, arte, render, act, CEREMONIA_ESPERA_MS } = await load();
        const ultima = await casiTodas(arte);

        const { container } = render(<Ceremonia />);
        act(() => {
            arte.awardPiece(ultima);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + 20);
        });

        expect(container.querySelector('.scanline-effect')).toBeNull();
        expect(document.body.className).toBe('');
    });
});

describe('la dieciséis · en el banco', () => {
    test('se reproduce al montarla, sin ganar nada', async () => {
        const { Ceremonia, arte, render } = await load();

        const { container } = render(<Ceremonia demo />);

        expect(container.querySelector('.ceremonia-nivel')).not.toBeNull();
        // Y el almacén sigue vacío: consultar el catálogo no regala piezas.
        expect(arte.readFound().size).toBe(0);
    });
});
