// tests/hooks/useClock.test.ts
import { renderHook, act } from '@testing-library/react';
import { useClock, CLOCK_PLACEHOLDER } from '@/hooks/useClock';

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 14, 5, 9));
});

afterEach(() => {
    jest.useRealTimers();
});

/** Deja correr el reloj. */
const corre = (ms: number) =>
    act(() => {
        jest.advanceTimersByTime(ms);
    });

describe('useClock · la hora de verdad', () => {
    // Antes el hueco enseñaba `--:--:--` fijo. Una terminal con reloj es una
    // terminal; y sobre todo, es el sitio donde tiene que NOTARSE que
    // `//date_off` le soltó la hora al sistema.
    test('en el primer render todavía no hay hora', () => {
        // El servidor no tiene reloj del usuario: si el primer render del
        // cliente pintara la hora, React tiraría el árbol entero. Ver REGLAS · C1.
        const { result } = renderHook(() => useClock());

        expect(result.current).toBe(CLOCK_PLACEHOLDER);
    });

    test('en cuanto arranca, muestra la hora', () => {
        const { result } = renderHook(() => useClock());

        corre(1);

        expect(result.current).toBe('14:05:09');
    });

    test('avanza cada segundo', () => {
        const { result } = renderHook(() => useClock());
        corre(1);

        corre(1000);

        expect(result.current).toBe('14:05:10');
    });

    test('sigue avanzando', () => {
        const { result } = renderHook(() => useClock());
        corre(1);

        corre(3000);

        expect(result.current).toBe('14:05:12');
    });

    test('es de 24 horas, no de 12', () => {
        jest.setSystemTime(new Date(2026, 8, 2, 23, 41, 2));
        const { result } = renderHook(() => useClock());

        corre(1);

        expect(result.current).toBe('23:41:02');
    });

    test('rellena con ceros a la izquierda', () => {
        jest.setSystemTime(new Date(2026, 8, 2, 7, 4, 3));
        const { result } = renderHook(() => useClock());

        corre(1);

        expect(result.current).toBe('07:04:03');
    });

    test('el hueco mide siempre lo mismo', () => {
        // Es monoespaciada y está en una barra: si la hora midiera distinto que
        // el marcador de posición, el pie daría un salto al arrancar.
        const { result } = renderHook(() => useClock());
        corre(1);

        expect(result.current).toHaveLength(CLOCK_PLACEHOLDER.length);
    });
});

describe('useClock · no deja temporizadores sueltos', () => {
    test('al desmontar deja de latir', () => {
        const { result, unmount } = renderHook(() => useClock());
        corre(1);
        const ultima = result.current;

        unmount();
        corre(5000);

        // Si el intervalo siguiera vivo, seguiría publicando y React avisaría de
        // una actualización sobre un componente desmontado.
        expect(result.current).toBe(ultima);
    });

    test('dos a la vez comparten un solo latido', () => {
        // Es un almacén de módulo, no un intervalo por componente: la hora tiene
        // que ser LA MISMA en todos los sitios donde se pinte.
        const a = renderHook(() => useClock());
        const b = renderHook(() => useClock());

        corre(1);
        corre(1000);

        expect(a.result.current).toBe(b.result.current);

        a.unmount();
        b.unmount();
    });
});
