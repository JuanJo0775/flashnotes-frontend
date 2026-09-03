// tests/docs/arte.test.ts

/**
 * `docs/ARTE.md` Y EL CÓDIGO DICEN LO MISMO.
 *
 * ⚠ POR QUÉ EXISTE ESTE TEST. Ese fichero es la copia de seguridad de los
 * dibujos Y el sitio donde se retocan a mano: es más cómodo mover un carácter en
 * un bloque de texto que dentro de un array de cadenas con barras escapadas.
 *
 * Pero nada ataba las dos copias, así que se separaron en silencio. Se
 * encontraron SIETE piezas —el casete, el pong, la pluma, la bombilla, el
 * arbusto, la estantería y la carita— retocadas en el documento y sin portar al
 * código, y sólo salieron a la luz al comparar antes de regenerar. Regenerar sin
 * mirar las habría borrado todas de una vez.
 *
 * Con este test, cualquiera de las dos direcciones falla en el acto:
 *
 *   · Se retocó el documento y no se portó → falla, y hay que llevarlo al código.
 *   · Se cambió el código y no se regeneró → falla, y hay que regenerar.
 *
 * Da igual cuál manda: lo que no puede pasar es que difieran sin que se sepa.
 */

import { readFileSync } from 'node:fs';
import { ART, ART_TOTAL } from '@/lib/system/asciiArt';

const DOC = readFileSync('docs/ARTE.md', 'utf8').replace(/\r/g, '');

/** Los bloques del documento, indexados por el `id` que declara cada uno. */
function bloquesDelDoc(): Map<string, string> {
    const encontrados = new Map<string, string>();
    const patron = /\*\*id:\*\* `([^`]+)`\n\n```\n([\s\S]*?)\n```/g;

    let m = patron.exec(DOC);
    while (m !== null) {
        encontrados.set(m[1], m[2]);
        m = patron.exec(DOC);
    }

    return encontrados;
}

describe('la copia de seguridad de los dibujos', () => {
    test('tiene un bloque por pieza, y ninguno de más', () => {
        // Uno de más es una pieza borrada del código que quedó en el documento:
        // alguien la buscaría para restaurarla y restauraría un fantasma.
        const ids = [...bloquesDelDoc().keys()].sort();

        expect(ids).toEqual(ART.map((p) => p.id).sort());
        expect(ids).toHaveLength(ART_TOTAL);
    });

    test('cada dibujo es IDÉNTICO en las dos copias', () => {
        const doc = bloquesDelDoc();
        const distintas = ART.filter((p) => doc.get(p.id) !== p.art).map((p) => p.id);

        // Se listan todas de una vez, no la primera: cuando derivan, derivan
        // varias, y arreglarlas de una en una obliga a correr el test siete veces
        // para descubrir que había siete.
        expect(distintas).toEqual([]);
    });

    test('y la cabecera dice cuántas son y cuánto miden', () => {
        // Si el número se queda viejo, el fichero miente por la cabecera aunque
        // los dibujos estén bien.
        expect(DOC).toContain(`Son **${ART_TOTAL}**`);
        expect(DOC).toContain('**40 caracteres**');
    });
});
