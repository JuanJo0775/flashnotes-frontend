// tests/lib/system/artSlots.test.ts

/**
 * LA COLECCIÓN SE VE COMO UN CATÁLOGO, CON SUS HUECOS.
 *
 * Antes enseñaba sólo lo que tenías, apilado. Así no se sabe **cuál** de las
 * ocho acabás de encontrar ni cuáles faltan: una colección sin huecos es una
 * lista, y lo que hace coleccionar es ver el sitio vacío.
 *
 * Cada pieza tiene un número FIJO —su sitio en el catálogo, no el orden en que
 * la encontraste— así que la nº 6 está siempre en el mismo hueco, la tengas o
 * no.
 */

import { artSlots, pieceIndexOf, ART, ART_TOTAL } from '@/lib/system/asciiArt';
import type { Note } from '@/types/note.types';

const nota = (art: string, id = 'x'): Note =>
    ({ _id: id, title: 't', content: `${art}\n\n-- PIE` }) as Note;

describe('reconocer una pieza guardada', () => {
    it('encuentra su número por el dibujo', () => {
        // Por el DIBUJO y no por el título: el título es texto que alguien podría
        // haber tocado, y el dibujo es la pieza.
        ART.forEach((p, i) => {
            expect(pieceIndexOf(nota(p.art).content)).toBe(i + 1);
        });
    });

    it('con algo que no es una pieza, no inventa un número', () => {
        expect(pieceIndexOf('hola qué tal')).toBeNull();
    });

    it('aguanta espacios de más al final de las líneas', () => {
        // Al pasar por el editor y volver, una línea puede perder o ganar un
        // espacio al final. Seguiría siendo la misma pieza.
        const sucio = ART[2].art
            .split('\n')
            .map((l) => `${l}  `)
            .join('\n');

        expect(pieceIndexOf(sucio)).toBe(3);
    });
});

describe('los ocho huecos', () => {
    it('siempre son ocho, tengas las que tengas', () => {
        expect(artSlots([])).toHaveLength(ART_TOTAL);
        expect(artSlots([nota(ART[0].art)])).toHaveLength(ART_TOTAL);
    });

    it('sin ninguna, están todos vacíos y numerados', () => {
        const huecos = artSlots([]);

        huecos.forEach((h, i) => {
            expect(h.number).toBe(i + 1);
            expect(h.note).toBeNull();
        });
    });

    it('cada pieza cae en SU hueco, no en el primero libre', () => {
        // La nº 6 va al sexto sitio aunque sea la única que tengas: si se
        // apilaran por orden de hallazgo, el número dejaría de significar nada.
        const huecos = artSlots([nota(ART[5].art, 'a')]);

        expect(huecos[5].note?._id).toBe('a');
        expect(huecos.filter((h) => h.note !== null)).toHaveLength(1);
    });

    it('con todas, no queda ni un hueco', () => {
        const todas = ART.map((p, i) => nota(p.art, `n${i}`));
        expect(artSlots(todas).every((h) => h.note !== null)).toBe(true);
    });

    it('una nota que no es ninguna pieza no ocupa hueco', () => {
        // No debería llegar acá, pero si llega no puede desplazar a una de
        // verdad ni robarle el sitio a la que falta.
        expect(artSlots([nota('cualquier cosa')]).every((h) => h.note === null)).toBe(
            true
        );
    });
});
