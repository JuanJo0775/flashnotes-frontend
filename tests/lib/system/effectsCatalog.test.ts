// tests/lib/system/effectsCatalog.test.ts

/**
 * EL CATÁLOGO DE EFECTOS Y EL CSS DICEN LO MISMO.
 *
 * ⚠ POR QUÉ EXISTE ESTE TEST. Es el mismo problema que ya mordió con `ARTE.md`
 * y con los números de `SECRETOS.md`: hay dos copias de la misma verdad
 * escritas en sitios distintos, y las dos copias se separan en silencio. Acá
 * son las animaciones del CSS y su descripción en el catálogo.
 *
 * Un catálogo que envejece es peor que no tener catálogo: no avisa de que está
 * mintiendo, y alguien escribe un efecto nuevo sin enterarse de que ya existía
 * uno casi igual — o busca uno que se borró hace meses.
 *
 * Falla en las dos direcciones, a propósito:
 *
 *   · Animación nueva sin catalogar → falla, y hay que describirla.
 *   · Entrada de una animación borrada → falla, y hay que quitarla.
 */

import { readFileSync } from 'node:fs';
import {
    VISUAL_EFFECTS,
    VISUAL_EFFECTS_TOTAL,
    effectsOf,
    type EffectSheet,
} from '@/lib/system/effectsCatalog';

const HOJAS: Record<EffectSheet, string> = {
    animations: 'src/styles/animations.css',
    glitch: 'src/styles/glitch.css',
    v02: 'src/styles/v02.css',
};

/** Los `@keyframes` que declara una hoja. */
function animacionesDe(hoja: EffectSheet): string[] {
    const css = readFileSync(HOJAS[hoja], 'utf8');

    return [...css.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)/g)].map((m) => m[1]).sort();
}

describe('la lista está completa', () => {
    it.each(Object.keys(HOJAS) as EffectSheet[])(
        'ni sobra ni falta ninguna en %s',
        (hoja) => {
            const enElCss = animacionesDe(hoja);
            const enElCatalogo = effectsOf(hoja)
                .map((e) => e.id)
                .sort();

            // Se comparan las listas enteras y no una pertenencia: así el
            // mensaje de fallo dice CUÁL falta, en vez de decir que algo no
            // cuadra y dejar la búsqueda a mano.
            expect(enElCatalogo).toEqual(enElCss);
        }
    );

    it('y el total sale de la lista, no de un número a mano', () => {
        const todas = (Object.keys(HOJAS) as EffectSheet[]).flatMap(animacionesDe);

        expect(VISUAL_EFFECTS_TOTAL).toBe(todas.length);
    });
});

describe('cada entrada sirve para algo', () => {
    it('ninguna se queda sin nombre ni sin explicación', () => {
        // Una entrada con la descripción vacía cumple el test de arriba y no
        // documenta nada: pasaría el control diciendo la verdad de forma inútil.
        for (const e of VISUAL_EFFECTS) {
            expect(e.nombre.length).toBeGreaterThan(2);
            expect(e.que.length).toBeGreaterThan(15);
            expect(e.cuando.length).toBeGreaterThan(10);
        }
    });

    it('no hay dos con el mismo identificador', () => {
        const ids = VISUAL_EFFECTS.map((e) => e.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it('⚠ y las clases de la muestra existen en su hoja', () => {
        /*
         * Ésta es la parte que hace que el banco no mienta.
         *
         * El catálogo dice qué clases hay que poner para VER cada efecto, y una
         * clase mal escrita da una muestra que no se mueve. Eso no se lee como
         * un error: se lee como «este efecto es sutil», y se queda así para
         * siempre.
         */
        for (const e of VISUAL_EFFECTS) {
            const css = readFileSync(HOJAS[e.hoja], 'utf8');

            for (const clase of e.clases.split(' ')) {
                expect(css).toContain(`.${clase}`);
            }
        }
    });
});
