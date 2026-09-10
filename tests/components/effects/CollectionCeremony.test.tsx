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

    test('al caer la última, el nivel baja y el barrido cruza', async () => {
        const { Ceremonia, arte, render, act, CEREMONIA_ESPERA_MS } = await load();
        const ultima = await casiTodas(arte);

        const { container } = render(<Ceremonia />);
        act(() => {
            arte.awardPiece(ultima);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + 20);
        });

        expect(container.querySelector('.ceremonia-nivel')).not.toBeNull();
        expect(container.querySelector('.scanline-effect.is-ceremonia')).not.toBeNull();
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

    test('⚠ con prefers-reduced-motion queda el momento, no la línea', async () => {
        /*
         * La regla manda sobre cualquier efecto (REGLAS · A3), y aun así quien
         * la tiene puesta no se queda sin nada: lo único que se salta es lo que
         * SE MUEVE. El nivel baja igual y la sala se calla igual.
         */
        const { Ceremonia, arte, render, act, CEREMONIA_ESPERA_MS } = await load(true);
        const ultima = await casiTodas(arte);

        const { container } = render(<Ceremonia />);
        act(() => {
            arte.awardPiece(ultima);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + 20);
        });

        expect(container.querySelector('.ceremonia-nivel')).not.toBeNull();
        expect(container.querySelector('.scanline-effect.is-ceremonia')).toBeNull();
    });
});

describe('la dieciséis · el barrido de siempre', () => {
    test('se aparta mientras dura, y vuelve al terminar', async () => {
        const { Ceremonia, arte, render, act, CEREMONIA_ESPERA_MS, CEREMONIA_MS } =
            await load();
        const ultima = await casiTodas(arte);

        render(<Ceremonia />);
        act(() => {
            arte.awardPiece(ultima);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + 20);
        });
        expect(document.body).toHaveClass('is-ceremonia');

        act(() => {
            jest.advanceTimersByTime(CEREMONIA_MS + 100);
        });
        expect(document.body).not.toHaveClass('is-ceremonia');
    });

    test('⚠ y la marca no se queda colgada si el componente se va', async () => {
        // Con la clase puesta para siempre, la app se quedaría sin su barrido.
        const { Ceremonia, arte, render, act, CEREMONIA_ESPERA_MS } = await load();
        const ultima = await casiTodas(arte);

        const { unmount } = render(<Ceremonia />);
        act(() => {
            arte.awardPiece(ultima);
            jest.advanceTimersByTime(CEREMONIA_ESPERA_MS + 20);
        });

        unmount();
        expect(document.body).not.toHaveClass('is-ceremonia');
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
