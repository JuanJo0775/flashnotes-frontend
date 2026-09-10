// tests/lib/system/coleccionEnLaVieja.test.ts

/**
 * LA COLECCIÓN, LEÍDA POR LA VERSIÓN QUE NO LA INVENTÓ.
 *
 * ⚠ QUÉ PROBLEMA RESUELVE. La colección era la ÚNICA vista que no se enteraba de
 * estar en la v0.2: el lateral, la lista, la papelera y la pantalla de carga
 * sacan sus rótulos por `useV02T` —una de cada cuatro sale sin traducir, a medio
 * hacer o mal traducida— y ésta los sacaba impecables. Una pantalla perfecta
 * dentro de una versión rota no se lee como una pantalla que se salvó: se lee
 * como una sección a medio hacer, y así se reportó jugando.
 *
 * ⚠ Y LO QUE SE PRUEBA ACÁ ES LA VARIEDAD, que es la parte que se pidió dos
 * veces. Con un solo fallo —«no se puede leer» en todas las que fallan— la
 * pantalla se lee como una función apagada. Lo que la hace parecer un formato
 * que no encaja es que cada pieza falle a SU manera.
 */

import { ART } from '@/lib/system/asciiArt';
import { halfLoaded } from '@/lib/system/artCorruption';
import { v02ArtMode, type V02ArtMode } from '@/lib/system/v02';
import { CARD_COLS, renderArtCard } from '@/lib/system/v02Card';

/** Cómo le sale cada una de las dieciséis a la versión vieja. */
const REPARTO = ART.reduce<Record<string, string[]>>((acc, pieza) => {
    const modo = v02ArtMode(pieza.id);
    (acc[modo] ??= []).push(pieza.id);
    return acc;
}, {});

describe('las cuatro maneras de fallar', () => {
    test('⚠ las cuatro le tocan a alguna pieza de verdad', () => {
        /*
         * El test que de verdad importa. Los tramos del dado pueden sumar uno y
         * aun así dejar un modo sin usar: con dieciséis piezas y un tramo fino,
         * la variedad existe en el código y no en la pantalla.
         */
        const modos: V02ArtMode[] = ['ok', 'corrupta', 'parcial', 'ilegible'];

        for (const modo of modos) {
            expect(REPARTO[modo] ?? []).not.toHaveLength(0);
        }
    });

    test('y la mayoría se leen bien', () => {
        // Si fallara casi todo, la colección dejaría de servir para nada acá
        // abajo — y lo que se cuenta es un formato que no encaja, no una ruina.
        expect(REPARTO.ok.length).toBeGreaterThan(ART.length / 2);
    });

    test('⚠ cada pieza falla SIEMPRE igual', () => {
        /*
         * Es lo que separa «una versión vieja» de «una avería». Si cambiara en
         * cada repintado, la pantalla sería un cartel de neón parpadeando.
         */
        for (const pieza of ART) {
            expect(v02ArtMode(pieza.id)).toBe(v02ArtMode(pieza.id));
        }
    });

    test('y fuera de la v0.2 esto no se consulta', () => {
        // La regla vive en `v02.ts` y la vista sólo la mira estando dentro; acá
        // se deja escrito que la función no sabe nada de versiones: la decisión
        // de llamarla es de quien pinta.
        expect(typeof v02ArtMode(ART[0].id)).toBe('string');
    });
});

describe('la que se corta a media carga', () => {
    const dibujo = ART[0].art;

    test('deja menos líneas de las que hay', () => {
        const cortado = halfLoaded(dibujo, 'x');

        expect(cortado.split('\n').length).toBeLessThan(dibujo.split('\n').length);
    });

    test('⚠ pero nunca menos de dos', () => {
        // Cortada en la primera no se distingue de una pieza que no cargó, y
        // ése es otro de los cuatro estados.
        for (const pieza of ART) {
            expect(halfLoaded(pieza.art, pieza.id).split('\n').length).toBeGreaterThanOrEqual(2);
        }
    });

    test('y es la misma cada vez', () => {
        expect(halfLoaded(dibujo, 'x')).toBe(halfLoaded(dibujo, 'x'));
    });

    test('no inventa nada: lo que sale es el principio del dibujo', () => {
        const cortado = halfLoaded(dibujo, 'x');

        expect(dibujo.startsWith(cortado)).toBe(true);
    });
});

describe('el cuadro dibujado de la casilla', () => {
    const cuadro = renderArtCard({ title: '7/16', art: 'aa\n\nbb', foot: 'POLILLA' });

    test('⚠ todas las líneas miden exactamente lo mismo', () => {
        /*
         * En una rejilla de caracteres, una fila más corta descuadra el dibujo
         * aunque los glifos alineen. Es la misma regla que fija la tarjeta de
         * nota de esta versión.
         */
        for (const linea of cuadro) expect(linea).toHaveLength(CARD_COLS);
    });

    test('lleva el número metido en la línea de arriba', () => {
        expect(cuadro[0]).toContain('7/16');
        expect(cuadro[0].startsWith('+-')).toBe(true);
    });

    test('⚠ y los renglones en blanco del dibujo NO se quitan', () => {
        // Son el aire de la pieza: quitarlos —que es lo que hace la tarjeta de
        // una nota— la apelmaza y deja de parecerse a lo que es.
        expect(cuadro.filter((l) => l.trim() === '|' + ' '.repeat(CARD_COLS - 2) + '|').length)
            .toBeGreaterThan(0);
    });

    test('el pie va abajo, separado del dibujo', () => {
        expect(cuadro[cuadro.length - 2]).toContain('POLILLA');
        expect(cuadro[cuadro.length - 1]).toBe(`+${'-'.repeat(CARD_COLS - 2)}+`);
    });

    test('y con la pieza ilegible sigue siendo un cuadro', () => {
        // Sin dibujo dentro, pero cuadro: un hueco sin marco se lee como que la
        // casilla no existe.
        const vacio = renderArtCard({ title: '7/16', art: '', foot: '[ NO SE PUEDE LEER ]' });

        for (const linea of vacio) expect(linea).toHaveLength(CARD_COLS);
        expect(vacio.length).toBeGreaterThan(3);
    });
});

describe('los cuadros que nadie remató', () => {
    /*
     * Lo último que quedaba de «interfaces a medio dibujar» (IDEAS · E2). Las
     * ETIQUETAS de esta versión ya salían a medias; los MARCOS estaban
     * impecables — cuadros perfectos dibujados por la misma gente que no llegó
     * a escribir los textos.
     */
    const cuadros = ART.map((p, i) =>
        renderArtCard({
            title: `${i + 1}/16`,
            art: 'aa',
            foot: 'X',
            clave: `${i + 1}/16`,
        })
    );

    const esquinas = (c: string[]) =>
        [c[0][0], c[0][c[0].length - 1], c[c.length - 1][0], c[c.length - 1][c[0].length - 1]];

    test('⚠ a alguno le falta una esquina', () => {
        const sueltos = cuadros.filter((c) => esquinas(c).some((e) => e !== '+'));

        expect(sueltos.length).toBeGreaterThan(0);
    });

    test('y a la mayoría no', () => {
        // Más y la pantalla deja de leerse como una versión sin terminar para
        // leerse como una avería.
        const enteros = cuadros.filter((c) => esquinas(c).every((e) => e === '+'));

        expect(enteros.length).toBeGreaterThan(cuadros.length / 2);
    });

    test('⚠ pero nunca le falta más de una', () => {
        // Un cuadro al que le faltan dos esquinas ya no es un cuadro sin
        // rematar: es una avería.
        for (const c of cuadros) {
            expect(esquinas(c).filter((e) => e !== '+').length).toBeLessThanOrEqual(1);
        }
    });

    test('⚠ y la línea sigue midiendo lo mismo', () => {
        // En una rejilla de caracteres, una fila más corta descuadra el dibujo
        // entero: el `+` se cambia por un espacio, no se quita.
        for (const c of cuadros) {
            for (const linea of c) expect(linea).toHaveLength(CARD_COLS);
        }
    });

    test('el mismo cuadro sale igual siempre', () => {
        const uno = renderArtCard({ title: '3/16', art: 'aa', foot: 'X', clave: '3/16' });
        const otro = renderArtCard({ title: '3/16', art: 'aa', foot: 'X', clave: '3/16' });

        expect(uno).toEqual(otro);
    });

    test('y sin clave no se toca nada', () => {
        const entero = renderArtCard({ title: '3/16', art: 'aa', foot: 'X' });

        expect(esquinas(entero)).toEqual(['+', '+', '+', '+']);
    });
});
