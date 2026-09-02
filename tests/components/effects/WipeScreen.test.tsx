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

test('empieza enseñando la lista entera, sin nada comido', () => {
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} />);

    const lista = document.querySelector('.wipe-list')?.textContent ?? '';

    expect(lista).toContain('secrets.idx');
    expect(lista).not.toContain('#');
});

test('se va comiendo sola, sin que nadie la toque', () => {
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} />);

    correElGuion(3);

    expect(document.querySelector('.wipe-list')?.textContent).toContain('#');
});

test('acaba en tres puntos', () => {
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} />);

    correElGuion(WIPE_STEPS + 1, 1_000);

    expect(document.querySelector('.wipe-dots')?.textContent).toBe('...');
});

test('avisa al terminar: es quien avisa el que devuelve al inicio', () => {
    sinPreferencia();
    const listo = jest.fn();
    render(<WipeScreen onDone={listo} />);

    correElGuion(WIPE_STEPS + 3, 1_000);

    expect(listo).toHaveBeenCalled();
});

test('la broma dice lo suyo al final', () => {
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} footer="ERA BROMA" />);

    correElGuion(WIPE_STEPS + 1, 1_000);

    // Por la clase y no por el texto: el mismo texto está también en el
    // `.sr-only`, y buscarlo suelto encuentra los dos.
    expect(document.querySelector('.wipe-footer')?.textContent).toBe('ERA BROMA');
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

test('quien escucha oye una frase, no once ficheros tachándose', () => {
    sinPreferencia();
    render(<WipeScreen onDone={() => {}} footer="ERA BROMA" />);

    expect(document.querySelector('.wipe-list')).toHaveAttribute(
        'aria-hidden',
        'true'
    );
    expect(document.querySelector('.sr-only')?.textContent).toBe('ERA BROMA');
});
