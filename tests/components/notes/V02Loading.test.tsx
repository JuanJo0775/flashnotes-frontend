// tests/components/notes/V02Loading.test.tsx

/**
 * La pantalla de carga de la v0.2, montada.
 *
 * La barra en sí ya está probada carácter a carácter aparte. Lo que se comprueba
 * acá es lo que aquellos tests no pueden ver: que se pinta, que late, y que
 * quien escucha oye una frase en vez de una barra repintándose sola cada
 * doscientos milisegundos.
 */

import { render, screen, act } from '@testing-library/react';
import V02Loading from '@/components/notes/V02Loading';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('pinta una barra dibujada con caracteres', () => {
    render(<V02Loading />);

    // Se busca por el dibujo y no por un `data-testid`: lo que tiene que estar
    // en pantalla es la barra, no una etiqueta que diga que la hay.
    expect(screen.getByText(/^\[#*\.*\]\s+\d+%$/)).toBeInTheDocument();
});

test('late: la barra cambia sola', () => {
    render(<V02Loading />);
    const antes = screen.getByText(/%$/).textContent;

    act(() => {
        jest.advanceTimersByTime(2_000);
    });

    expect(screen.getByText(/%$/).textContent).not.toBe(antes);
});

test('quien escucha oye una frase, no el dibujo', () => {
    render(<V02Loading />);

    // Todos los `<pre>` van con `aria-hidden`: leer cuarenta almohadillas una a
    // una no le dice a nadie que se está cargando algo.
    const dibujos = document.querySelectorAll('pre');
    expect(dibujos.length).toBeGreaterThan(0);
    for (const pre of dibujos) {
        expect(pre).toHaveAttribute('aria-hidden', 'true');
    }

    expect(document.querySelector('.sr-only')?.textContent ?? '').not.toBe('');
});

test('se apaga al desmontarse: no deja un intervalo latiendo solo', () => {
    const { unmount } = render(<V02Loading />);
    unmount();

    expect(jest.getTimerCount()).toBe(0);
});
