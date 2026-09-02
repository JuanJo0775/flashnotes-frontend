// tests/lib/system/v02Loading.test.ts

/**
 * LA BARRA DE CARGA DE LA v0.2.
 *
 * Dibujada con caracteres, y mal hecha: el porcentaje se pasa de cien, pega
 * saltos hacia atrás y el total no lo sabe nadie. Es la barra de progreso que
 * escribe quien todavía no tiene forma de saber cuánto queda y la pone igual,
 * porque una pantalla de carga sin barra parecía peor.
 */

import { renderLoadingBar, BAR_COLS, fakeProgress } from '@/lib/system/v02Loading';

describe('la barra dibujada', () => {
    it('mide siempre lo mismo, esté como esté', () => {
        for (const pct of [0, 1, 50, 99, 100, 137, -20]) {
            expect(renderLoadingBar(pct)).toHaveLength(BAR_COLS);
        }
    });

    it('se llena de izquierda a derecha', () => {
        const poco = renderLoadingBar(10);
        const mucho = renderLoadingBar(90);

        const llenos = (s: string) => (s.match(/#/g) ?? []).length;
        expect(llenos(mucho)).toBeGreaterThan(llenos(poco));
    });

    it('lleva el número pegado, y deja que se pase de cien', () => {
        // Recortarlo a 100 sería arreglarlo. Una barra que dice 137% es
        // exactamente lo que se ve cuando el total era una suposición.
        expect(renderLoadingBar(137)).toContain('137%');
    });

    it('no se sale del dibujo aunque el número sea absurdo', () => {
        expect(renderLoadingBar(137)).toHaveLength(BAR_COLS);
        expect(renderLoadingBar(137)).toMatch(/^\[#+\.*\]/);
    });

    it('todo lo que dibuja es ASCII imprimible', () => {
        // Los bloques (`█`) no están en JetBrains Mono: los pintaría una fuente
        // de reserva con otras métricas y la barra dejaría de medir lo que dice
        // medir (REGLAS · C8). Con `#` y `.` no hay nada que medir.
        expect(renderLoadingBar(50)).toMatch(/^[\x20-\x7E]+$/);
    });
});

describe('el progreso, que no progresa bien', () => {
    it('avanza con los latidos', () => {
        expect(fakeProgress(6, () => 0.9)).toBeGreaterThan(fakeProgress(1, () => 0.9));
    });

    it('a veces pega un salto hacia atrás', () => {
        // Con el dado en contra, el mismo latido da menos que sin él: es una
        // barra que se corrige a sí misma, que es lo que hacen las que miden
        // mal.
        expect(fakeProgress(6, () => 0)).toBeLessThan(fakeProgress(6, () => 0.9));
    });

    it('se pasa de cien si le dan tiempo', () => {
        expect(fakeProgress(40, () => 0.9)).toBeGreaterThan(100);
    });
});
