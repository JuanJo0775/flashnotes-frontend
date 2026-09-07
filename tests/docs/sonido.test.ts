// tests/docs/sonido.test.ts

/**
 * `docs/SONIDO.md` Y EL CÓDIGO DICEN LO MISMO.
 *
 * ⚠ POR QUÉ EXISTE ESTE TEST. Es el tercero de la casa —después del de `ARTE.md`
 * y el de los números de `SECRETOS.md`— y por la misma razón exacta: hay dos
 * copias de la misma verdad escritas en sitios distintos, y las dos copias se
 * separan en silencio.
 *
 * Acá duele especialmente. Los niveles son la única parte del sonido que se
 * puede equivocar SIN QUE NADIE SE ENTERE: un documento que dice −24 mientras el
 * código dice −14 no rompe nada, no tira ningún error, y le hace perder media
 * hora a quien intente entender por qué las teclas tapan a los confirms.
 */

import { readFileSync } from 'node:fs';
import { GATE_MS, PEAK_DBFS, type SoundCategory } from '@/lib/system/audio/mix';
import { CATEGORY_OF } from '@/lib/system/audio/voices';

const DOC = readFileSync('docs/SONIDO.md', 'utf8').replace(/\r/g, '');

describe('el presupuesto de volumen', () => {
    it('la tabla del documento dice los mismos niveles que el código', () => {
        for (const [familia, db] of Object.entries(PEAK_DBFS)) {
            // El menos es el de verdad (U+2212), que es el que se escribe en
            // prosa; buscarlo con un guion normal daría un falso negativo.
            expect(DOC).toContain(`| \`${familia}\` | −${Math.abs(db)} dBFS |`);
        }
    });

    it('y no inventa familias que no existen', () => {
        const enElDoc = [...DOC.matchAll(/\| `([a-z]+)` \| −\d+ dBFS \|/g)].map((m) => m[1]);

        expect(enElDoc.sort()).toEqual(Object.keys(PEAK_DBFS).sort());
    });

    it('⚠ y la escalera del documento sube en el mismo orden', () => {
        /*
         * El orden NO es decorativo: es la jerarquía de atención. Si el
         * documento la listara al revés, alguien que lo lea para decidir un
         * nivel nuevo lo pondría exactamente donde no va.
         */
        const enElDoc = [...DOC.matchAll(/\| `([a-z]+)` \| −(\d+) dBFS \|/g)].map((m) => [
            m[1],
            -Number(m[2]),
        ]) as [SoundCategory, number][];

        for (let i = 1; i < enElDoc.length; i += 1) {
            expect(enElDoc[i][1]).toBeGreaterThan(enElDoc[i - 1][1]);
        }
    });
});

describe('la compuerta', () => {
    it('el documento dice el hueco que el código aplica', () => {
        expect(DOC).toContain(`dentro de ${GATE_MS} ms`);
    });
});

describe('las voces', () => {
    it('están todas en la tabla, y ninguna de más', () => {
        // Una voz sin documentar es una que nadie sabe que puede usar; una
        // documentada que ya no existe manda a buscar un fantasma.
        const enElDoc = [...DOC.matchAll(/\| `([a-zA-Z]+)` \| `([a-z]+)` \|/g)].map((m) => m[1]);

        expect(enElDoc.sort()).toEqual(Object.keys(CATEGORY_OF).sort());
    });

    it('y cada una con la familia que declara el código', () => {
        for (const [voz, familia] of Object.entries(CATEGORY_OF)) {
            expect(DOC).toContain(`| \`${voz}\` | \`${familia}\` |`);
        }
    });
});

describe('lo que el documento promete de sí mismo', () => {
    it('dice que está atado, y lo está', () => {
        // Si alguien quita el test, esta línea queda mintiendo. Es lo más cerca
        // que se puede estar de que el documento se defienda solo.
        expect(DOC).toContain('tests/docs/sonido.test.ts');
    });

    it('y no promete ambiente, que todavía no existe', () => {
        /*
         * ⚠ El ambiente TIENE una fila en la tabla de volúmenes —está
         * presupuestado— pero no hay ninguna voz que lo toque. El documento
         * tiene que decirlo en «lo que falta», o promete algo que no suena.
         */
        expect(Object.keys(CATEGORY_OF)).not.toContain('ambience');
        expect(DOC).toMatch(/## Lo que falta[\s\S]*\*\*El ambiente\.\*\*/);
    });
});
