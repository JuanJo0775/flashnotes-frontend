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

describe('todo es ASCII imprimible', () => {
    it.each(ART.map((p) => [p.id, p]))('«%s» no lleva bloques', (_id, piece) => {
        // Los bloques (█ ▌ ░) NO están en JetBrains Mono: los pinta una fuente de
        // reserva con otras métricas y el dibujo se descuadra fila a fila
        // (REGLAS · C8).
        expect((piece as (typeof ART)[number]).art).toMatch(/^[\x20-\x7E\n]+$/);
    });
});

describe('cada una cuenta su camino', () => {
    it('son ocho, y ninguna comparte origen', () => {
        expect(ART).toHaveLength(ART_TOTAL);
        expect(new Set(ART.map((p) => p.source)).size).toBe(ART_TOTAL);
    });
});
