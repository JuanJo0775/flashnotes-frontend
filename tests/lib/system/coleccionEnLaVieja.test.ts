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
