// tests/lib/system/arteCableado.test.ts

/**
 * CADA CAMINO DEL ARTE ESTÁ CABLEADO A ALGO QUE PASA.
 *
 * ⚠ SE PIDIÓ REVISARLO ENTERO: «debes revisar si el cableado para desbloquear el
 * arte funciona al 100%». Salió de un informe —la broma del `//reset` no parecía
 * dar nada— que resultó ser otra cosa: la pieza entraba y no se veía. Pero la
 * pregunta de fondo era buena, porque este cableado se puede romper EN SILENCIO
 * de tres maneras distintas y ninguna falla la compilación:
 *
 *  1 · Una fuente declarada que nadie otorga. La pieza existe, ocupa su sitio en
 *      el catálogo, y no hay forma humana de ganarla.
 *  2 · Un `awardFrom` con un camino que ya no existe. TypeScript lo caza, porque
 *      `ArtSource` es un tipo cerrado.
 *  3 · Dos piezas con el mismo camino. `ART_SOURCES` se construye a partir de la
 *      lista, así que la segunda pisa a la primera y una queda inalcanzable.
 *
 * Este fichero cubre 1 y 3. El 2 lo cubre el compilador.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ART, ART_SOURCES, ART_TOTAL, type ArtSource } from '@/lib/system/asciiArt';

/** Todo el código de `src`, en una sola cuerda. */
function fuentes(dir: string): string {
    let texto = '';

    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        const ruta = join(dir, entrada.name);

        if (entrada.isDirectory()) texto += fuentes(ruta);
        else if (/\.tsx?$/.test(entrada.name)) texto += readFileSync(ruta, 'utf8');
    }

    return texto;
}

const CODIGO = fuentes('src');

/**
 * El hueco que está SIN CABLEAR a propósito, y que por eso se nombra acá.
 *
 * ⚠ NO ES UNA EXCEPCIÓN PARA QUE EL TEST CALLE. Esta pieza pasó por tres dueños
 * —el ojo, la polilla, la cinta— y cada mudanza dejó un pie contando algo que ya
 * no pasaba; se queda quieta hasta que su camino esté decidido. Nombrarla acá es
 * lo que hace que el día que se cablee, este test avise de que sobra la
 * excepción en vez de dejarla puesta para siempre.
 */
const SIN_CABLEAR: readonly ArtSource[] = ['reserved-tape'];

describe('ninguna pieza es inalcanzable', () => {
    it.each(ART.map((p) => [p.source, p.id]))(
        'el camino «%s» lo otorga alguien',
        (source) => {
            if (SIN_CABLEAR.includes(source as ArtSource)) return;

            expect(CODIGO).toContain(`awardFrom('${source}')`);
        }
    );

    it('⚠ y lo que está sin cablear lo dice, en vez de faltar en silencio', () => {
        for (const source of SIN_CABLEAR) {
            expect(CODIGO).not.toContain(`awardFrom('${source}')`);
        }
    });

    it('⚠ dos piezas no pueden compartir camino', () => {
        /*
         * `ART_SOURCES` se construye recorriendo la lista y quedándose con el
         * último: dos piezas con el mismo `source` dejarían a la primera sin
         * forma de ganarse, y el catálogo seguiría enseñando su hueco.
         */
        const caminos = ART.map((p) => p.source);

        expect(new Set(caminos).size).toBe(caminos.length);
        expect(Object.keys(ART_SOURCES)).toHaveLength(ART_TOTAL);
    });

    it('y cada camino apunta a una pieza que existe', () => {
        // `ART_SOURCES` sale de la propia lista, así que esto no puede fallar
        // hoy — y es justo lo que hay que fijar antes de que a alguien se le
        // ocurra escribir el mapa a mano.
        for (const id of Object.values(ART_SOURCES)) {
            expect(ART.some((p) => p.id === id)).toBe(true);
        }
    });
});
