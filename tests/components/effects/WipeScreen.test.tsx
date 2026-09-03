// tests/components/effects/WipeScreen.test.tsx

/**
 * La pantalla que se come a sí misma, montada.
 *
 * El guion ya está probado aparte, paso por paso. Lo que se comprueba acá es lo
 * que aquellos tests no pueden ver: que las fases se suceden solas, que termina
 * avisando —porque quien avisa es quien devuelve al inicio— y que con
 * `prefers-reduced-motion` no hay desfile pero sí final.
 */

import { render, act } from '@testing-library/react';
import WipeScreen from '@/components/effects/WipeScreen';
import { WIPE_STEPS, WIPE_STEP_MS } from '@/lib/system/wipe';

/**
 * Adelanta el reloj VARIAS VECES.
 *
 * Cada fase agenda la siguiente desde su propio efecto, y ese efecto no corre
 * hasta que React vuelve a pintar — cosa que pasa al SALIR de `act`, no dentro.
 * Un solo salto largo avanza un paso y se queda esperando. Hay que salir y
 * volver a entrar tantas veces como pasos haya.
 */
const correElGuion = (veces: number, ms = WIPE_STEP_MS) => {
    for (let i = 0; i < veces; i += 1) {
        act(() => {
            jest.advanceTimersByTime(ms);
        });
    }
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

/** Por defecto nadie pide menos movimiento. */
const sinPreferencia = () => {
    window.matchMedia = jest.fn().mockImplementation((q: string) => ({
        matches: false,
        media: q,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }));
};

const pideQuieto = () => {
    window.matchMedia = jest.fn().mockImplementation((q: string) => ({
        matches: true,
        media: q,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }));
};

test('empieza DESVANECIENDO la app, sin enseñar nada', () => {
    // Sin esto, la pantalla de borrado aparecía de golpe sobre las notas y se
    // leía como un diálogo. Lo que hay que ver primero es a la app irse.
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} />);

    expect(document.documentElement).toHaveAttribute('data-wiping');
    expect(document.querySelector('.wipe-list')).toBeNull();
});

test('después enseña la lista entera, sin nada comido', () => {
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} />);

    correElGuion(1, 1_000);

    const lista = document.querySelector('.wipe-list')?.textContent ?? '';

    expect(lista).toContain('secrets.idx');
    expect(lista).not.toContain('#');
});

test('el desvanecido se retira al desmontarse: no deja la app invisible', () => {
    sinPreferencia();
    const { unmount } = render(<WipeScreen onDone={() => {}} />);

    unmount();

    expect(document.documentElement).not.toHaveAttribute('data-wiping');
});

test('se va comiendo sola, sin que nadie la toque', () => {
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} />);

    correElGuion(4, 1_000);

    expect(document.querySelector('.wipe-list')?.textContent).toContain('#');
});

test('acaba apagando el tubo', () => {
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} />);

    // Un paso por línea, más el desvanecido: el apagón es el siguiente.
    correElGuion(WIPE_STEPS + 1, 1_000);

    // Es el MISMO elemento que usa el fallo crítico: una capa aparte que se
    // cierra sobre lo que haya debajo. Animar la pantalla entera daba otra cosa
    // —el contenido se aplastaba con ella— y se veía al revés.
    expect(document.querySelector('.collapse-dying')).not.toBeNull();
});

test('avisa al terminar: es quien avisa el que devuelve al inicio', () => {
    sinPreferencia();
    const listo = jest.fn();
    render(<WipeScreen onDone={listo} />);

    correElGuion(WIPE_STEPS + 4, 1_000);

    expect(listo).toHaveBeenCalled();
});

test('la broma recorre lo mismo y al final confiesa, con carita', () => {
    // El susto tiene que ser IDÉNTICO hasta el último momento, o deja de ser un
    // susto: quien la ve no puede notar por dónde va a salir.
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} prank />);

    correElGuion(WIPE_STEPS + 2, 1_000);

    expect(document.querySelector('.wipe-face')?.textContent).toBe(':)');
    expect(document.querySelector('.wipe-footer')?.textContent ?? '').toMatch(
        /BROMA|KIDDING/i
    );
    // Y no se apaga: no hay nada que apagar cuando no se borró nada.
    expect(document.querySelector('.collapse-dying')).toBeNull();
});

test('con menos movimiento no hay desfile, pero sí final', () => {
    // REGLAS · A3: quien lo tiene puesto no se pierde nada, porque el resultado
    // es exactamente el mismo. Lo que se salta es el espectáculo.
    pideQuieto();
    const listo = jest.fn();
    render(<WipeScreen onDone={listo} />);

    expect(document.querySelector('.wipe-list')).toBeNull();

    act(() => {
        jest.advanceTimersByTime(2_000);
    });

    expect(listo).toHaveBeenCalled();
});

test('quien escucha oye una frase, no catorce ficheros tachándose', () => {
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} />);

    correElGuion(1, 1_000);

    expect(document.querySelector('.wipe-list')).toHaveAttribute(
        'aria-hidden',
        'true'
    );
    expect(document.querySelector('.sr-only')?.textContent ?? '').not.toBe('');
});
