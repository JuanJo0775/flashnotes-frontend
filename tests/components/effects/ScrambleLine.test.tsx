// tests/components/effects/ScrambleLine.test.tsx
import { render, screen, act } from '@testing-library/react';
import ScrambleLine, { SCRAMBLE_MS } from '@/components/effects/ScrambleLine';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const corre = (ms: number) =>
    act(() => {
        jest.advanceTimersByTime(ms);
    });

const texto = () => screen.getByTestId('scramble').textContent ?? '';

describe('ScrambleLine · no se deja leer', () => {
    test('conserva el largo del nombre de verdad', () => {
        // Saber que un comando mide cinco letras es una pista real —se cruza con
        // lo que sueltan las ventanas de error— sin regalar nada.
        render(<ScrambleLine length={5} />);
        corre(1);

        expect(texto()).toHaveLength('//'.length + 5);
    });

    test('lleva el prefijo, para que se lea como un comando', () => {
        render(<ScrambleLine length={5} />);
        corre(1);

        expect(texto().startsWith('//')).toBe(true);
    });

    test('debajo del prefijo sólo hay letras y dígitos', () => {
        render(<ScrambleLine length={8} />);
        corre(1);

        expect(texto().slice(2)).toMatch(/^[a-z0-9]+$/);
    });
});

describe('ScrambleLine · se revuelve solo', () => {
    // Un rótulo fijo que diga «ilegible» es la app contándote que hay algo
    // escondido; unas letras que no paran quietas SON algo escondido.
    test('cambia con el tiempo', () => {
        render(<ScrambleLine length={8} />);
        corre(1);
        const antes = texto();

        corre(SCRAMBLE_MS * 6);

        expect(texto()).not.toBe(antes);
    });

    test('no para: sigue cambiando después', () => {
        render(<ScrambleLine length={8} />);
        corre(1);

        corre(SCRAMBLE_MS * 6);
        const medio = texto();
        corre(SCRAMBLE_MS * 6);

        expect(texto()).not.toBe(medio);
    });

    test('cambia POCAS letras por vuelta, no todas', () => {
        // Revolviéndolas enteras el bloque se lee como ruido de televisión y
        // deja de parecer texto. Cambiando unas pocas, parece una palabra que el
        // sistema intenta resolver y no puede.
        render(<ScrambleLine length={12} />);
        corre(1);
        const antes = texto();

        corre(SCRAMBLE_MS);

        const distintas = [...texto()].filter((c, i) => c !== antes[i]).length;
        expect(distintas).toBeLessThanOrEqual(2);
    });

    test('el largo nunca cambia mientras se revuelve', () => {
        render(<ScrambleLine length={7} />);
        corre(1);

        for (let i = 0; i < 20; i += 1) {
            corre(SCRAMBLE_MS);
            expect(texto()).toHaveLength(2 + 7);
        }
    });

    test('al desmontar deja de latir', () => {
        const { unmount } = render(<ScrambleLine length={5} />);
        corre(1);

        unmount();

        expect(() => corre(SCRAMBLE_MS * 10)).not.toThrow();
    });
});
