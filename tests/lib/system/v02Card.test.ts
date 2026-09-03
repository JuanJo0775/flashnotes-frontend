// tests/lib/system/v02Card.test.ts
import { CARD_COLS, renderCard } from '@/lib/system/v02Card';

const nota = (over: Partial<Parameters<typeof renderCard>[0]> = {}) =>
    renderCard({
        title: 'Guiones tecleados',
        content: 'linea 1\nlinea 2\nlinea 3\nlinea 4',
        meta: '5.2KB',
        ...over,
    });

describe('v02Card · el cuadro cuadra', () => {
    test('todas las líneas miden lo mismo', () => {
        // En una rejilla de caracteres, una fila más corta descuadra el dibujo
        // aunque los glifos alineen.
        for (const l of nota()) {
            expect(l).toHaveLength(CARD_COLS);
        }
    });

    test('sigue cuadrando con un título larguísimo', () => {
        for (const l of nota({ title: 'x'.repeat(200) })) {
            expect(l).toHaveLength(CARD_COLS);
        }
    });

    test('y con una nota vacía', () => {
        for (const l of nota({ content: '', meta: '0B' })) {
            expect(l).toHaveLength(CARD_COLS);
        }
    });

    test('y con líneas de contenido larguísimas', () => {
        for (const l of nota({ content: 'y'.repeat(300) })) {
            expect(l).toHaveLength(CARD_COLS);
        }
    });
});

describe('v02Card · está dibujado, no maquetado', () => {
    test('las esquinas son cruces', () => {
        const filas = nota();

        expect(filas[0].startsWith('+')).toBe(true);
        expect(filas[0].endsWith('+')).toBe(true);
        expect(filas[filas.length - 1]).toMatch(/^\+-+\+$/);
    });

    test('los lados son barras', () => {
        const filas = nota();

        for (const l of filas.slice(1, -1)) {
            expect(l.startsWith('|')).toBe(true);
            expect(l.endsWith('|')).toBe(true);
        }
    });

    test('el título va metido en el marco de arriba', () => {
        // Así se lee como una etiqueta pegada al cuadro y no como una primera
        // fila cualquiera.
        expect(nota()[0]).toContain('Guiones tecleados');
    });

    test('el hueco del pie se rellena con puntos', () => {
        // Es como se alineaban dos cosas en extremos opuestos antes de que
        // hubiera con qué.
        expect(nota().join('\n')).toMatch(/\.{5,}/);
    });

    test('el dato del pie se ve', () => {
        expect(nota().join('\n')).toContain('5.2KB');
    });
});

describe('v02Card · sólo ASCII imprimible', () => {
    // Los bloques y los marcos de caja NO están en JetBrains Mono: los pinta una
    // reserva con otras métricas y el cuadro se descuadra fila a fila. Es la
    // trampa que hizo bailar el corte del pong.
    test('ningún carácter fuera del ASCII imprimible', () => {
        for (const l of nota({ title: 'ñandú áéí', content: 'çà' })) {
            for (const c of l) {
                const p = c.codePointAt(0)!;
                if (p >= 0x20 && p < 0x7f) continue;
                // El texto del usuario puede traer acentos; el MARCO no.
                expect('ñandúáéíçà'.includes(c)).toBe(true);
            }
        }
    });

    test('el marco usa sólo + - y |', () => {
        const filas = nota();
        const marco = [filas[filas.length - 1], ...filas.slice(1, -1).map((l) => l[0])];

        expect(marco.join('')).toMatch(/^[+\-|]+$/);
    });
});

describe('v02Card · corta lo que no cabe', () => {
    test('avisa de que cortó', () => {
        // Un texto cortado a secas parece que la nota decía eso. El `>` dice que
        // hay más y que el cuadro no daba.
        expect(nota({ content: 'z'.repeat(200) }).join('\n')).toContain('>');
    });

    test('siempre enseña las mismas filas de contenido', () => {
        // Un cuadro que cambia de alto según la nota no es un cuadro dibujado,
        // es una caja que se estira.
        expect(nota({ content: 'una' })).toHaveLength(nota().length);
    });
});
