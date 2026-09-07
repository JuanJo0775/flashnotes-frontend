// tests/lib/system/artFaces.test.ts

/**
 * LAS DOS CARAS DE LA PIEZA CATORCE.
 *
 * ⚠ NO SON DOS PIEZAS, Y ESO NO ES UN DETALLE. El hueco es UNO y cuál te toca
 * depende del final que elegiste: ayudarlo te deja el ojo, reportarlo te deja el
 * ojo VEDADO. Si contaran como dos, la colección pasaría a diecisiete y nunca se
 * podría completar, porque los dos finales se excluyen.
 *
 * Por eso el vedado no tiene `id:` propio y por eso vive aparte de `ART`. Pero
 * seguía siendo invisible desde fuera del módulo, así que la página de identidad
 * enseñaba dieciséis dibujos cuando existen diecisiete — y el que faltaba era
 * justo el del final alternativo.
 */

import { ART, ART_FACES } from '@/lib/system/asciiArt';

describe('la cara tapada', () => {
    it('existe, y cuelga de una pieza de verdad', () => {
        expect(ART_FACES.length).toBeGreaterThan(0);

        for (const cara of ART_FACES) {
            expect(ART.some((p) => p.id === cara.of)).toBe(true);
        }
    });

    it('es la del ojo, y no la de otra', () => {
        expect(ART_FACES.map((c) => c.of)).toContain('eye');
    });

    it('no es el mismo dibujo: si lo fuera, no habría segunda cara', () => {
        for (const cara of ART_FACES) {
            const pieza = ART.find((p) => p.id === cara.of)!;

            expect(cara.art).not.toBe(pieza.art);
        }
    });

    it('⚠ pero MIDE lo mismo, celda por celda', () => {
        /*
         * `ARTE.md` avisa de esto y no había nada que lo sujetara: «el dibujo de
         * debajo es el mismo celda por celda, quien retoque una tiene que
         * retocar la otra, o dejarán de leerse como el mismo dibujo».
         *
         * Es exactamente la clase de deriva que nadie ve: las dos caras no se
         * miran nunca juntas —te toca una según el final— así que una podría
         * quedarse dos filas más corta durante meses.
         */
        for (const cara of ART_FACES) {
            const pieza = ART.find((p) => p.id === cara.of)!;

            const filas = (s: string) => s.split('\n');
            const anchos = (s: string) => filas(s).map((l) => l.length);

            expect(filas(cara.art)).toHaveLength(filas(pieza.art).length);
            expect(anchos(cara.art)).toEqual(anchos(pieza.art));
        }
    });

    it('y se llama distinto, que es el remate', () => {
        // El pie de siempre lo dice ÉL, de tú. En el final en que lo reportás el
        // ente calla, y quien rotula es la máquina institucional — que no tutea.
        for (const cara of ART_FACES) {
            const pieza = ART.find((p) => p.id === cara.of)!;

            expect(cara.caption.es).not.toBe(pieza.caption.es);
            expect(cara.caption.en).not.toBe(pieza.caption.en);
        }
    });
});
