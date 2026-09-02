// tests/lib/system/artEarned.test.ts

/**
 * EL ARTE NO SE REGALA: SE GANA.
 *
 * `//art` sacaba una pieza cada vez que se tecleaba. Eso convertía la colección
 * en ocho pulsaciones de Enter y hacía que la pestaña con estrella no
 * significara nada — una colección de cosas fáciles de conseguir no es una
 * colección, es una lista.
 *
 * Ahora `//art` es un CATÁLOGO que no da nada, y cada pieza llega por un camino
 * distinto: el ente, la v0.2, los dos marcadores del pong, los secretos. Ocho
 * piezas por ocho caminos, así que la colección completa es un mapa de todo lo
 * que hay escondido. Ésa es la única razón que justifica que tenga sección
 * propia.
 */

import {
    ART,
    ART_TOTAL,
    awardPiece,
    readFound,
    clearFound,
    catalogRows,
    pieceByNumber,
    ART_SOURCES,
} from '@/lib/system/asciiArt';

beforeEach(() => {
    clearFound();
    localStorage.clear();
});

describe('ganarse una pieza', () => {
    it('la primera vez, la da', () => {
        expect(awardPiece('moth')?.id).toBe('moth');
        expect(readFound().has('moth')).toBe(true);
    });

    it('la segunda vez, NO da nada', () => {
        // Ésta es la mitad importante: si un canal diera piezas cada vez, con
        // insistir veinte veces se tendrían las ocho y volveríamos al principio.
        awardPiece('moth');

        expect(awardPiece('moth')).toBeNull();
        expect(readFound().size).toBe(1);
    });

    it('un identificador que no existe no inventa nada', () => {
        expect(awardPiece('no-existe')).toBeNull();
        expect(readFound().size).toBe(0);
    });

    it('cada camino da SU pieza, no una al azar', () => {
        // Que la pieza de la v0.2 sea siempre la misma es lo que permite que el
        // dibujo hable de dónde salió.
        awardPiece('floppy');

        expect([...readFound()]).toEqual(['floppy']);
    });
});

describe('el mapa de caminos', () => {
    it('cada pieza tiene el suyo, y no se repiten', () => {
        const fuentes = ART.map((p) => p.source);

        expect(fuentes).toHaveLength(ART_TOTAL);
        expect(new Set(fuentes).size).toBe(ART_TOTAL);
    });

    it('está declarado en un solo sitio', () => {
        // Con el mapa en dos sitios, uno se queda viejo. `ART_SOURCES` se deriva
        // de las propias piezas.
        for (const p of ART) {
            expect(ART_SOURCES[p.source]).toBe(p.id);
        }
    });
});

describe('el catálogo', () => {
    it('sin ninguna pieza, no hay catálogo', () => {
        // Un catálogo vacío anunciaría que hay una colección que llenar, y
        // encontrar la primera es parte de lo que se descubre.
        expect(catalogRows()).toEqual([]);
    });

    it('con una, salen las OCHO filas', () => {
        awardPiece('crt');

        expect(catalogRows()).toHaveLength(ART_TOTAL);
    });

    it('la que tenés sale con su nombre; las demás, tapadas', () => {
        awardPiece('crt');

        const filas = catalogRows();
        const crt = filas[ART.findIndex((p) => p.id === 'crt')];

        expect(crt.found).toBe(true);
        expect(crt.label).toMatch(/TERMINAL/i);

        expect(filas.filter((f) => !f.found)).toHaveLength(ART_TOTAL - 1);
    });

    it('de las tapadas viaja el LARGO, no el nombre', () => {
        // Lo que no está no se puede leer en el inspector. Y el largo es una
        // pista de verdad, igual que en `//help`.
        awardPiece('crt');

        for (const fila of catalogRows().filter((f) => !f.found)) {
            expect(fila.label).toBe('');
            expect(fila.length).toBeGreaterThan(0);
        }
    });

    it('cada pieza conserva su número, la tengas o no', () => {
        awardPiece('key');

        catalogRows().forEach((fila, i) => {
            expect(fila.number).toBe(i + 1);
        });
    });
});

describe('elegir una por número', () => {
    it('devuelve la que toca, si la tenés', () => {
        awardPiece('crt');
        expect(pieceByNumber(3)?.id).toBe('crt');
    });

    it('null si no la tenés: no se dibuja lo que no se ganó', () => {
        expect(pieceByNumber(3)).toBeNull();
    });

    it('null si el número no existe', () => {
        awardPiece('crt');

        expect(pieceByNumber(0)).toBeNull();
        expect(pieceByNumber(99)).toBeNull();
        expect(pieceByNumber(-1)).toBeNull();
    });
});
