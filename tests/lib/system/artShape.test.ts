// tests/lib/system/artShape.test.ts

/**
 * LAS OCHO SON UNA SERIE, Y SE TIENEN QUE VER COMO UNA SERIE.
 *
 * Medían entre 17 y 25 caracteres de ancho. En el catálogo bailaban unas
 * respecto a otras: ocho dibujos sueltos en vez de una colección.
 *
 * Y tienen que ocupar SITIO. Una pieza de cinco filas en el hueco del editor se
 * ve como un icono, no como algo que valga la pena haber ganado — pero treinta
 * filas obligarían a desplazar para ver un dibujo, que es lo contrario de lo que
 * un dibujo hace.
 */

import { ART, ART_TOTAL } from '@/lib/system/asciiArt';

/** El ancho de la serie. Todas, exactamente éste. */
const ANCHO = 40;

describe('todas miden lo mismo', () => {
    it.each(ART.map((p) => [p.id, p]))('«%s» mide %s de ancho', (_id, piece) => {
        for (const linea of (piece as (typeof ART)[number]).art.split('\n')) {
            expect(linea).toHaveLength(ANCHO);
        }
    });
});

describe('ocupan sitio, sin pasarse', () => {
    it.each(ART.map((p) => [p.id, p]))('«%s» tiene alto de pieza', (_id, piece) => {
        const filas = (piece as (typeof ART)[number]).art.split('\n').length;

        // Menos de siete se ve como un icono; más de catorce obliga a
        // desplazar, y un dibujo que hay que desplazar deja de ser un dibujo.
        expect(filas).toBeGreaterThanOrEqual(7);
        expect(filas).toBeLessThanOrEqual(14);
    });
});

describe('nada que la monoespaciada no tenga', () => {
    /*
     * ⚠ LA REGLA NO ES «SÓLO ASCII», ES «NADA QUE FALTE EN JETBRAINS MONO».
     *
     * Esto exigía `[\x20-\x7E]` y era demasiado estricto: la `Ø` de la flor está
     * en la fuente de la casa y se pinta perfecta, pero el test la rechazaba por
     * no ser ASCII. Prohibir de más obliga a dibujar peor sin ganar nada.
     *
     * Lo que de verdad rompe los dibujos son los BLOQUES (U+2580–259F) y los
     * MARCOS DE CAJA (U+2500–257F): ésos NO están en JetBrains Mono, los pinta
     * una fuente de reserva con otras métricas, y el dibujo se descuadra fila a
     * fila. Es lo que hizo bailar el corte del pong (REGLAS · C8).
     */
    it.each(ART.map((p) => [p.id, p]))(
        '«%s» no lleva bloques ni marcos de caja',
        (_id, piece) => {
            expect((piece as (typeof ART)[number]).art).not.toMatch(
                /[─-▟]/
            );
        }
    );

    it.each(ART.map((p) => [p.id, p]))('«%s» no lleva nada exótico', (_id, piece) => {
        // Latin-1 y punto: lo que hay en cualquier monoespaciada decente.
        expect((piece as (typeof ART)[number]).art).toMatch(
            /^[\x20-\x7E -ÿ\n]+$/
        );
    });
});

describe('cada una cuenta su camino', () => {
    it('son ocho, y ninguna comparte origen', () => {
        expect(ART).toHaveLength(ART_TOTAL);
        expect(new Set(ART.map((p) => p.source)).size).toBe(ART_TOTAL);
    });
});
