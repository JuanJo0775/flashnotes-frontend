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
import { IDLE_MS } from '@/lib/system/audio/wire';
import { SCREEN_SOUNDS, SEEK_MS } from '@/lib/system/audio/screens';

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

    it('⚠ el ambiente ya no está en «lo que falta», porque ya suena', () => {
        /*
         * Esta comprobación cambió cuando el ambiente se construyó, y ese cambio
         * ES el trabajo del test: mientras no existía, exigía que el documento
         * lo listara como pendiente; ahora exige lo contrario. Un documento que
         * sigue prometiendo algo que ya está hecho envejece igual de mal que uno
         * que promete algo que no existe.
         */
        const faltan = /## Lo que falta([\s\S]*)$/.exec(DOC)?.[1] ?? '';

        expect(faltan).not.toContain('El ambiente');
        expect(DOC).toContain('## El ambiente');
    });

    it('y dice el hueco de inactividad que el código aplica', () => {
        // El número que decide si el zumbido cansa o no. Escrito a mano en la
        // prosa, se queda viejo a la primera que alguien lo ajuste de oído.
        //
        // Se comparan sin separadores de millar: la prosa escribe «40 000» y el
        // código dice 40000, y las dos formas son correctas donde están. Lo que
        // no puede pasar es que digan números distintos.
        const sinSeparadores = DOC.replace(/(\d)[\s ](\d)/g, '$1$2');

        expect(sinSeparadores).toContain(`${IDLE_MS} ms`);
    });

    it('⚠ y el ritmo del cabezal, que es lo que TAPA ese hueco', () => {
        /*
         * Los dos numeros solo se entienden juntos: la barra de reinicio puede
         * durar mas que `IDLE_MS`, asi que sin un sonido que la acompane la
         * maquina se quedaria muerta justo mientras trabaja. Que el documento
         * lleve los dos atados evita que alguien suba uno sin mirar el otro.
         */
        const sinSeparadores = DOC.replace(/(\d)[\s ](\d)/g, '$1$2');

        expect(sinSeparadores).toContain(`${SEEK_MS} ms`);
        expect(SEEK_MS).toBeLessThan(IDLE_MS);
    });

    it('⚠ y no se olvida de que el silencio es CERO', () => {
        /*
         * Es la frase que impide que alguien «optimice» el derrumbe bajando el
         * ambiente a un valor muy pequeño. Casi nada y nada no son lo mismo, y
         * ahí está justamente el efecto.
         */
        expect(DOC).toContain('cero exacto');
    });
});

describe('⚠ la tabla de pantallas y el documento dicen lo mismo', () => {
    /*
     * Es la tercera copia de la misma verdad —la tabla, el codigo que la
     * recorre y la prosa— y las copias se separan en silencio. Aca duele
     * especialmente: una marca que el documento no nombre es una pantalla que
     * suena sin que nadie sepa por que, y una que nombre de mas es una promesa
     * que ya no existe.
     */
    it.each(SCREEN_SOUNDS.map((s) => [s.mark, s.what]))(
        'el documento cuenta «%s»',
        (mark, what) => {
            expect(DOC).toContain(`\`.${mark}\``);
            expect(DOC).toContain(what);
        }
    );
});
