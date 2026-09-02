// tests/components/layout/SystemClock.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import SystemClock from '@/components/layout/SystemClock';
import { forgetWord, sessionWord, toMorse } from '@/lib/system/morse';

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 14, 5, 9));
    forgetWord();
});

afterEach(() => {
    jest.useRealTimers();
});

const corre = (ms: number) =>
    act(() => {
        jest.advanceTimersByTime(ms);
    });

const reloj = () => screen.getByTestId('system-clock');

const clic = (veces: number) => {
    for (let i = 0; i < veces; i += 1) fireEvent.click(reloj());
};

describe('SystemClock · es un reloj', () => {
    test('enseña la hora del equipo', () => {
        render(<SystemClock />);

        corre(1);

        expect(reloj()).toHaveTextContent('14:05:09');
    });

    test('y corre', () => {
        render(<SystemClock />);
        corre(1);

        corre(2000);

        expect(reloj()).toHaveTextContent('14:05:11');
    });
});

describe('SystemClock · tres clics enseñan el código', () => {
    // Este hueco enseñaba `--:--:--`, y eso ya parecía morse. La pieza no se
    // inventó: se leyó de algo que llevaba ahí desde el principio.
    test('con dos clics todavía es un reloj', () => {
        render(<SystemClock />);
        corre(1);

        clic(2);

        expect(reloj()).toHaveTextContent('14:05:09');
    });

    test('al tercero sale el código de la sesión', () => {
        render(<SystemClock />);
        corre(1);

        clic(3);

        expect(reloj().textContent).toBe(toMorse(sessionWord()));
    });

    test('el código es sólo puntos, rayas y el dos puntos del reloj', () => {
        // Así se lee como una hora rota y no como un adorno pegado encima.
        render(<SystemClock />);
        corre(1);
        clic(3);

        expect(reloj().textContent).toMatch(/^[.:-]+$/);
    });

    test('pasado un rato vuelve a ser un reloj', () => {
        render(<SystemClock />);
        corre(1);
        clic(3);

        corre(10_000);

        expect(reloj()).toHaveTextContent(/\d\d:\d\d:\d\d/);
    });

    test('clics lentos no cuentan', () => {
        // Nadie hace tres clics seguidos sin querer; tres clics repartidos en un
        // minuto, cualquiera. La ventana es lo que separa el gesto del accidente.
        render(<SystemClock />);
        corre(1);

        clic(1);
        corre(2000);
        clic(1);
        corre(2000);
        clic(1);

        expect(reloj()).toHaveTextContent(/\d\d:\d\d:\d\d/);
    });

    test('la cuenta se reinicia: se puede volver a sacar', () => {
        render(<SystemClock />);
        corre(1);
        clic(3);
        corre(10_000);

        clic(3);

        expect(reloj().textContent).toBe(toMorse(sessionWord()));
    });
});

describe('SystemClock · accesibilidad', () => {
    test('se anuncia como lo que dice ser: la hora', () => {
        // No es un botón ni es enfocable. Un objetivo de teclado anunciaría que
        // hay algo, y lo que hay es un secreto.
        render(<SystemClock />);

        expect(screen.getByLabelText(/hora|time/i)).toBeInTheDocument();
    });
});
