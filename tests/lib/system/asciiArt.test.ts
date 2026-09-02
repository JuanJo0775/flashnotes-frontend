// tests/lib/system/asciiArt.test.ts
import {
    ART,
    ART_TOTAL,
    asNote,
    canKeep,
    clearFound,
    drawArt,
    readFound,
} from '@/lib/system/asciiArt';

beforeEach(() => {
    localStorage.clear();
    clearFound();
});

describe('asciiArt · la base', () => {
    test('hay unas cuantas piezas', () => {
        expect(ART_TOTAL).toBeGreaterThanOrEqual(6);
    });

    test('ninguna se repite de identificador', () => {
        expect(new Set(ART.map((a) => a.id)).size).toBe(ART_TOTAL);
    });

    test('todas traen pie en los dos idiomas', () => {
        for (const p of ART) {
            expect(p.caption.es.length).toBeGreaterThan(0);
            expect(p.caption.en.length).toBeGreaterThan(0);
        }
    });

    test('el pie no es el mismo texto en los dos idiomas', () => {
        // Salvo cifras y siglas, si coincide es que quedó sin traducir.
        const iguales = ART.filter((p) => p.caption.es === p.caption.en);

        expect(iguales).toHaveLength(0);
    });
});

describe('asciiArt · sólo ASCII imprimible', () => {
    // Los bloques (█ ▌ ░) NO están en JetBrains Mono: los pinta una fuente de
    // reserva con otras métricas y el dibujo se descuadra fila a fila. Es la
    // misma trampa que hizo bailar el corte del pong.
    test('ningún carácter fuera del ASCII imprimible', () => {
        for (const p of ART) {
            for (const c of p.art) {
                if (c === '\n') continue;
                const punto = c.codePointAt(0)!;
                expect(punto).toBeGreaterThanOrEqual(0x20);
                expect(punto).toBeLessThan(0x7f);
            }
        }
    });

    test('todas las filas de una pieza miden lo mismo', () => {
        // Una fila más corta descoloca el dibujo aunque los glifos alineen.
        for (const p of ART) {
            const filas = p.art.split('\n');
            const anchos = new Set(filas.map((f) => f.length));

            expect(anchos.size).toBe(1);
        }
    });

    test('ninguna es tan alta como para tener que desplazarla', () => {
        // Un dibujo que no entra de una vez deja de ser un dibujo.
        for (const p of ART) {
            expect(p.art.split('\n').length).toBeLessThanOrEqual(12);
        }
    });

    test('ni tan ancha como para romper el hueco del editor', () => {
        for (const p of ART) {
            for (const f of p.art.split('\n')) {
                expect(f.length).toBeLessThanOrEqual(40);
            }
        }
    });
});

describe('asciiArt · coleccionarlas', () => {
    test('al principio no hay ninguna', () => {
        expect(readFound().size).toBe(0);
    });

    test('sacar una la deja registrada', () => {
        const { piece } = drawArt(() => 0);

        expect(readFound().has(piece.id)).toBe(true);
    });

    test('la primera es nueva', () => {
        expect(drawArt(() => 0).isNew).toBe(true);
    });

    test('informa de cuántas van', () => {
        const r = drawArt(() => 0);

        expect(r.found).toBe(1);
        expect(r.total).toBe(ART_TOTAL);
    });

    test('prioriza las que faltan: se completan en ART_TOTAL tiradas', () => {
        // Sorteando entre todas a ciegas, la última pedía una media de veinte
        // intentos y coleccionar se volvía un trámite.
        for (let i = 0; i < ART_TOTAL; i += 1) drawArt(() => 0);

        expect(readFound().size).toBe(ART_TOTAL);
    });

    test('cada tirada hasta completar es nueva', () => {
        for (let i = 0; i < ART_TOTAL; i += 1) {
            expect(drawArt(() => 0).isNew).toBe(true);
        }
    });

    test('completada, empieza a repetir y ya no suma', () => {
        for (let i = 0; i < ART_TOTAL; i += 1) drawArt(() => 0);

        const otra = drawArt(() => 0.5);
        expect(otra.isNew).toBe(false);
        expect(otra.found).toBe(ART_TOTAL);
    });

    test('sobrevive a recargar', () => {
        // La colección vive en `localStorage`: releerla de cero tiene que dar lo
        // mismo, que es lo que pasa al volver a abrir la pestaña.
        drawArt(() => 0);

        expect(readFound().size).toBe(1);
        expect(readFound().size).toBe(1);
    });

    test('un almacenamiento roto no rompe nada', () => {
        localStorage.setItem('flashnotes:art', 'no soy json');

        expect(readFound().size).toBe(0);
        expect(() => drawArt(() => 0)).not.toThrow();
    });

    test('un identificador que ya no existe se ignora', () => {
        localStorage.setItem('flashnotes:art', JSON.stringify(['pieza-borrada']));

        expect(readFound().size).toBe(0);
    });
});

describe('asciiArt · guardar una', () => {
    test('sin ninguna encontrada, no se puede', () => {
        expect(canKeep()).toBe(false);
    });

    test('con la primera ya se puede', () => {
        // Esperar a tenerlas todas dejaría el comando inútil justo mientras se
        // colecciona, que es cuando dan ganas de guardar una.
        drawArt(() => 0);

        expect(canKeep()).toBe(true);
    });

    test('la nota lleva el dibujo y su pie', () => {
        const nota = asNote(ART[0], 'es');

        expect(nota).toContain(ART[0].art);
        expect(nota).toContain(ART[0].caption.es);
    });

    test('el pie va en el idioma que se pida', () => {
        expect(asNote(ART[0], 'en')).toContain(ART[0].caption.en);
    });
});
