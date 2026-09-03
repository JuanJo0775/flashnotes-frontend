// tests/components/effects/ChromaticFailure.test.tsx
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

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

    const [efecto, system, theme, rtl] = await Promise.all([
        import('@/components/effects/ChromaticFailure'),
        import('@/hooks/useSystemState'),
        import('@/hooks/useTheme'),
        import('@testing-library/react'),
    ]);

    return {
        ChromaticFailure: efecto.default,
        FLICKER_STEPS: efecto.FLICKER_STEPS,
        FLICKER_GAP_MS: efecto.FLICKER_GAP_MS,
        system,
        theme,
        ...rtl,
    };
}

function romper(system: { registerThemeToggle: () => boolean; THEME_BREAK_AT: number }) {
    for (let i = 0; i < system.THEME_BREAK_AT; i += 1) system.registerThemeToggle();
}

/**
 * El componente pide azar dos veces por ciclo: primero para la espera (5–14 s) y
 * después para decidir si esa sacudida es suelta o una ráfaga (1 de cada 3).
 * Clavando el valor se eligen las dos cosas a la vez, así que cada test fija el
 * que le corresponde en vez de avanzar el reloj a ojo — en un minuto entran
 * entre cuatro y doce sacudidas, y con un número par el tema vuelve al de
 * partida y parece que nada pasó.
 */
const SIN_RAFAGA = 0.5; // espera 9500 ms · 0,5 ≥ 1/3, así que no hay ráfaga
const CON_RAFAGA = 0.1; // espera 5900 ms · 0,1 < 1/3, así que sí la hay

const TRAS_SACUDIDA_SUELTA = 9500 + 200;
const TRAS_PRIMER_PASO_DE_RAFAGA = 5900 + 50;

/** Fija el azar del componente para todo el test. */
function conAzar(valor: number) {
    jest.spyOn(Math, 'random').mockReturnValue(valor);
}

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    jest.useFakeTimers();
    conAzar(SIN_RAFAGA);
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
});

describe('ChromaticFailure · con la señal sana', () => {
    test('no pinta nada', async () => {
        const { ChromaticFailure, render } = await load();

        const { container } = render(<ChromaticFailure />);

        expect(container.firstChild).toBeNull();
    });

    test('no toca el tema', async () => {
        const { ChromaticFailure, theme, render, act } = await load();
        theme.setTheme('light');

        render(<ChromaticFailure />);
        act(() => {
            jest.advanceTimersByTime(120_000);
        });

        expect(theme.getTheme()).toBe('light');
    });
});

describe('ChromaticFailure · con la señal rota', () => {
    test('pinta las barras de arrastre', async () => {
        const { ChromaticFailure, system, render } = await load();
        romper(system);

        const { container } = render(<ChromaticFailure />);

        expect(container.querySelector('.chromatic-tear')).not.toBeNull();
    });

    test('el tema se sacude solo', async () => {
        const { ChromaticFailure, system, theme, render, act } = await load();
        theme.setTheme('light');
        romper(system);

        render(<ChromaticFailure />);
        act(() => {
            jest.advanceTimersByTime(TRAS_SACUDIDA_SUELTA);
        });

        expect(theme.getTheme()).toBe('dark');
    });

    test('sigue sacudiéndose: no es una sola vez', async () => {
        const { ChromaticFailure, system, theme, render, act } = await load();
        theme.setTheme('light');
        romper(system);

        render(<ChromaticFailure />);
        act(() => {
            jest.advanceTimersByTime(TRAS_SACUDIDA_SUELTA);
        });
        const primero = theme.getTheme();
        act(() => {
            jest.advanceTimersByTime(TRAS_SACUDIDA_SUELTA);
        });

        expect(theme.getTheme()).not.toBe(primero);
    });

    test('la sacudida NO pisa el tema que elegiste', async () => {
        // La avería es visual. Que te rompa la preferencia guardada sería una
        // consecuencia real de un chiste, y eso no.
        const { ChromaticFailure, system, theme, render, act } = await load();
        theme.setTheme('light');
        romper(system);

        render(<ChromaticFailure />);
        act(() => {
            jest.advanceTimersByTime(120_000);
        });

        expect(localStorage.getItem(theme.THEME_STORAGE_KEY)).toBe('light');
    });

    test('al desmontarse deja de sacudir', async () => {
        const { ChromaticFailure, system, theme, render, act } = await load();
        theme.setTheme('light');
        romper(system);

        const { unmount } = render(<ChromaticFailure />);
        unmount();
        act(() => {
            jest.advanceTimersByTime(120_000);
        });

        expect(theme.getTheme()).toBe('light');
    });
});

describe('ChromaticFailure · cubre toda la superficie', () => {
    // El `text-shadow` sólo alcanza al TEXTO: bordes, fondos, botones y el
    // medidor ASCII se quedaban limpios y el fallo se veía a medias. El filtro
    // SVG separa los canales de lo YA RENDERIZADO, así que le llega a todo.
    test('publica el filtro que parte los canales', async () => {
        const { ChromaticFailure, system, render } = await load();
        romper(system);

        const { container } = render(<ChromaticFailure />);

        expect(container.querySelector('filter#chroma-split-a')).not.toBeNull();
    });

    test('el filtro separa el rojo del resto y los desplaza', async () => {
        const { ChromaticFailure, system, render } = await load();
        romper(system);

        const { container } = render(<ChromaticFailure />);
        const filtro = container.querySelector('filter#chroma-split-a')!;

        expect(filtro.querySelectorAll('feColorMatrix')).toHaveLength(2);
        expect(filtro.querySelectorAll('feOffset')).toHaveLength(2);
        expect(filtro.querySelector('feBlend')).not.toBeNull();
    });

    test('las dos matrices parten la MISMA imagen de origen', async () => {
        // Sin `in="SourceGraphic"` explícito, una primitiva SVG toma la salida
        // de la anterior: el cian se calculaba sobre la imagen ya reducida a
        // rojo, daba negro, y screen(rojo, negro) dejaba TODA la app bañada en
        // rojo en vez de con franjas de aberración. Sólo se veía corriéndolo.
        const { ChromaticFailure, system, render } = await load();
        romper(system);

        const { container } = render(<ChromaticFailure />);

        for (const m of container.querySelectorAll('feColorMatrix')) {
            expect(m.getAttribute('in')).toBe('SourceGraphic');
        }
    });

    test('trae varias variantes, para que la aberración se mueva', async () => {
        const { ChromaticFailure, system, render } = await load();
        romper(system);

        const { container } = render(<ChromaticFailure />);

        expect(container.querySelectorAll('filter').length).toBeGreaterThan(1);
    });

    test('interpola en sRGB y no en lineal, que lava el color', async () => {
        const { ChromaticFailure, system, render } = await load();
        romper(system);

        const { container } = render(<ChromaticFailure />);

        for (const f of container.querySelectorAll('filter')) {
            expect(f.getAttribute('color-interpolation-filters')).toBe('sRGB');
        }
    });

    test('el SVG de las definiciones no ocupa sitio ni se anuncia', async () => {
        const { ChromaticFailure, system, render } = await load();
        romper(system);

        const { container } = render(<ChromaticFailure />);
        const svg = container.querySelector('svg')!;

        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(svg.getAttribute('width')).toBe('0');
        expect(svg.getAttribute('height')).toBe('0');
    });

    test('con la señal sana no publica ningún filtro', async () => {
        const { ChromaticFailure, render } = await load();

        const { container } = render(<ChromaticFailure />);

        expect(container.querySelector('svg')).toBeNull();
    });
});

describe('ChromaticFailure · la ráfaga', () => {
    // Además de las inversiones sueltas cada 5–14 s, de vez en cuando la señal
    // se cae de golpe: claro-oscuro-claro-oscuro-claro, seguido.
    test('la ráfaga empieza invirtiendo, igual que una sacudida suelta', async () => {
        const { ChromaticFailure, system, theme, render, act } = await load();
        conAzar(CON_RAFAGA);
        theme.setTheme('light');
        romper(system);

        render(<ChromaticFailure />);
        act(() => {
            jest.advanceTimersByTime(TRAS_PRIMER_PASO_DE_RAFAGA);
        });

        expect(theme.getTheme()).toBe('dark');
    });

    test('sigue moviéndose donde una sacudida suelta ya se habría quedado quieta', async () => {
        const { ChromaticFailure, system, theme, render, act, FLICKER_GAP_MS } =
            await load();
        conAzar(CON_RAFAGA);
        theme.setTheme('light');
        romper(system);

        render(<ChromaticFailure />);
        act(() => {
            jest.advanceTimersByTime(TRAS_PRIMER_PASO_DE_RAFAGA + FLICKER_GAP_MS);
        });

        expect(theme.getTheme()).toBe('light');
    });

    test('la ráfaga termina donde empezó', async () => {
        const { ChromaticFailure, system, theme, render, act, FLICKER_GAP_MS, FLICKER_STEPS } =
            await load();
        conAzar(CON_RAFAGA);
        theme.setTheme('light');
        romper(system);

        render(<ChromaticFailure />);
        act(() => {
            jest.advanceTimersByTime(
                TRAS_PRIMER_PASO_DE_RAFAGA + FLICKER_GAP_MS * FLICKER_STEPS
            );
        });

        expect(theme.getTheme()).toBe('light');
    });

    test('la ráfaga es un saltazo, no un fundido', async () => {
        // Rápida a propósito. Supera el umbral de destellos de la WCAG y eso
        // está asumido: hay que provocarla con diez pulsaciones, es esporádica,
        // y `prefers-reduced-motion` la apaga entera. Este test fija que sea
        // rápida de verdad y que no se le escape a nadie hacia un valor que ya
        // no se sentiría como un fallo.
        const { FLICKER_GAP_MS } = await load();

        expect(FLICKER_GAP_MS).toBeLessThanOrEqual(150);
        expect(FLICKER_GAP_MS).toBeGreaterThan(60);
    });

    test('la ráfaga tiene un número par de pasos', async () => {
        // Impar dejaría el tema invertido al terminar, y la ráfaga se leería
        // como una sacudida suelta más larga en vez de como un temblor.
        const { FLICKER_STEPS } = await load();

        expect(FLICKER_STEPS % 2).toBe(0);
    });
});

describe('ChromaticFailure · movimiento reducido', () => {
    test('la avería se ve, pero el tema no se sacude', async () => {
        // Un parpadeo de claro a oscuro cada tantos segundos es exactamente lo
        // que quien pide menos movimiento está pidiendo no tener.
        const { ChromaticFailure, system, theme, render, act } = await load(true);
        theme.setTheme('light');
        romper(system);

        const { container } = render(<ChromaticFailure />);
        act(() => {
            jest.advanceTimersByTime(120_000);
        });

        expect(container.querySelector('.chromatic-tear')).not.toBeNull();
        expect(theme.getTheme()).toBe('light');
    });
});
