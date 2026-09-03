// tests/components/effects/PhantomError.test.tsx
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

    const [efecto, system, rtl] = await Promise.all([
        import('@/components/effects/PhantomError'),
        import('@/hooks/useSystemState'),
        import('@testing-library/react'),
    ]);

    return {
        PhantomError: efecto.default,
        PHANTOM_MIN_MS: efecto.PHANTOM_MIN_MS,
        PHANTOM_VISIBLE_MS: efecto.PHANTOM_VISIBLE_MS,
        PHANTOM_MAX_LOCKED: efecto.PHANTOM_MAX_LOCKED,
        system,
        ...rtl,
    };
}

function romper(system: { registerThemeToggle: () => boolean; THEME_BREAK_AT: number }) {
    for (let i = 0; i < system.THEME_BREAK_AT; i += 1) system.registerThemeToggle();
}

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
});

describe('PhantomError · cuándo aparece', () => {
    test('con la señal sana no aparece nunca', async () => {
        const { PhantomError, render, act } = await load();

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(120_000);
        });

        expect(container.querySelector('.phantom-error')).toBeNull();
    });

    test('con la señal rota, aparece sola', async () => {
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        romper(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });

        expect(container.querySelector('.phantom-error')).not.toBeNull();
    });

    test('y se cierra sola', async () => {
        const { PhantomError, system, render, act, PHANTOM_MIN_MS, PHANTOM_VISIBLE_MS } =
            await load();
        romper(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });
        expect(container.querySelector('.phantom-error')).not.toBeNull();

        act(() => {
            jest.advanceTimersByTime(PHANTOM_VISIBLE_MS + 100);
        });

        expect(container.querySelector('.phantom-error')).toBeNull();
    });

    test('al desmontarse deja de aparecer', async () => {
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        romper(system);

        const { unmount } = render(<PhantomError />);
        unmount();

        expect(() =>
            act(() => {
                jest.advanceTimersByTime(PHANTOM_MIN_MS * 5);
            })
        ).not.toThrow();
    });
});

describe('PhantomError · no estorba', () => {
    test('no intercepta el puntero', async () => {
        // Es un adorno: si te comiera un clic mientras escribís, dejaría de ser
        // un chiste y pasaría a ser un defecto.
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        romper(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });

        expect(container.querySelector('.phantom-error')).toHaveStyle(
            'pointer-events: none'
        );
    });

    test('no se anuncia a un lector de pantalla', async () => {
        // Un error falso leído en voz alta es una mentira, no una broma.
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        romper(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });

        expect(container.querySelector('.phantom-error')).toHaveAttribute(
            'aria-hidden',
            'true'
        );
    });

    test('no es un <dialog>: no roba el foco', async () => {
        const antes = document.createElement('textarea');
        document.body.appendChild(antes);
        antes.focus();

        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        romper(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });

        expect(container.querySelector('dialog')).toBeNull();
        expect(document.activeElement).toBe(antes);
        antes.remove();
    });
});

describe('PhantomError · qué dice', () => {
    test('lleva un código de error con pinta de sistema', async () => {
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        romper(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });

        expect(container.textContent).toMatch(/0x[0-9A-F]{4}/);
    });

    test('trae varios mensajes, no siempre el mismo', async () => {
        const { PhantomError } = await load();
        const { PHANTOM_MESSAGES } = await import('@/components/effects/PhantomError');

        expect(PhantomError).toBeDefined();
        expect(PHANTOM_MESSAGES.length).toBeGreaterThan(3);
    });
});

describe('PhantomError · movimiento reducido', () => {
    test('no aparece', async () => {
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load(true);
        romper(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS * 4);
        });

        expect(container.querySelector('.phantom-error')).toBeNull();
    });
});

describe('PhantomError · durante el bloqueo', () => {
    /** Lleva el sistema hasta la memoria corrupta. */
    function bloquear(system: { registerCollapse: () => unknown; LOCKOUT_AT: number }) {
        for (let i = 0; i < system.LOCKOUT_AT; i += 1) system.registerCollapse();
    }

    test('también salen: es el estado más crítico, no el más tranquilo', async () => {
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        bloquear(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });

        expect(container.querySelector('.phantom-error')).not.toBeNull();
    });

    test('NO se cierran solas: la pantalla se va llenando', async () => {
        // Con la señal rota el sistema todavía se recompone solo; con la memoria
        // corrupta ya no limpia nada.
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        bloquear(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });
        act(() => {
            jest.advanceTimersByTime(60_000);
        });

        expect(container.querySelectorAll('.phantom-error').length).toBeGreaterThan(0);
    });

    test('pero nunca más de cinco', async () => {
        const { PhantomError, system, render, act, PHANTOM_MAX_LOCKED } = await load();
        bloquear(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(300_000);
        });

        expect(container.querySelectorAll('.phantom-error').length).toBeLessThanOrEqual(
            PHANTOM_MAX_LOCKED
        );
    });

    test('suben por encima de la pantalla de error, o no se verían', async () => {
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        bloquear(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });

        const v = container.querySelector('.phantom-error') as HTMLElement;
        expect(Number(v.style.zIndex)).toBeGreaterThan(10001);
    });

    test('siguen sin recibir el puntero: tapan el puzzle pero no lo bloquean', async () => {
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        bloquear(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });

        expect(container.querySelector('.phantom-error')).toHaveStyle(
            'pointer-events: none'
        );
    });
});

describe('PhantomError · durante el bloqueo salen de a una', () => {
    function bloquear(system: { registerCollapse: () => unknown; LOCKOUT_AT: number }) {
        for (let i = 0; i < system.LOCKOUT_AT; i += 1) system.registerCollapse();
    }

    test('la pantalla se llena poco a poco, no de golpe', async () => {
        // Cinco de golpe sería un susto; de a una es una degradación, que es lo
        // que este estado tiene que contar.
        const { PhantomError, system, render, act, PHANTOM_MIN_MS } = await load();
        bloquear(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(PHANTOM_MIN_MS + 100);
        });

        expect(container.querySelectorAll('.phantom-error')).toHaveLength(1);
    });
});

describe('PhantomError · sobreviven a la recarga', () => {
    function bloquear(system: { registerCollapse: () => unknown; LOCKOUT_AT: number }) {
        for (let i = 0; i < system.LOCKOUT_AT; i += 1) system.registerCollapse();
    }

    test('las guardadas vuelven al montar con el bloqueo activo', async () => {
        // Volver y encontrarse la pantalla de error LIMPIA daría a entender que
        // recargar sirve de algo, que es justo lo que este estado niega.
        localStorage.setItem(
            'flashnotes:phantoms',
            JSON.stringify([
                { id: 1, code: '0x1F3A', text: 'ALGO', topPct: 20, leftPct: 30 },
                { id: 2, code: '0x00C4', text: 'OTRO', topPct: 50, leftPct: 40 },
            ])
        );

        const { PhantomError, system, render, act } = await load();
        bloquear(system);

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(50);
        });

        expect(container.querySelectorAll('.phantom-error')).toHaveLength(2);
    });

    test('el primer render NO las siembra: eso rompería la hidratación', async () => {
        // En el primer render, useSyncExternalStore devuelve todavía el estado
        // del SERVIDOR. Sembrarlas ahí daría un desajuste (servidor cero,
        // cliente dos) y además el propio `lockedOut` se leería como false.
        localStorage.setItem(
            'flashnotes:phantoms',
            JSON.stringify([{ id: 1, code: '0x1F3A', text: 'ALGO', topPct: 20, leftPct: 30 }])
        );

        const { PhantomError, system, render } = await load();
        bloquear(system);

        const { container } = render(<PhantomError />);

        expect(container.querySelector('.phantom-error')).toBeNull();
    });

    test('sin bloqueo no se recupera nada', async () => {
        localStorage.setItem(
            'flashnotes:phantoms',
            JSON.stringify([{ id: 1, code: '0x1F3A', text: 'ALGO', topPct: 20, leftPct: 30 }])
        );

        const { PhantomError, render, act } = await load();

        const { container } = render(<PhantomError />);
        act(() => {
            jest.advanceTimersByTime(50);
        });

        expect(container.querySelector('.phantom-error')).toBeNull();
    });
});
