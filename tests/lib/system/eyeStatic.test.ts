// tests/lib/system/eyeStatic.test.ts

/**
 * EL OJO DETRÁS DE LA PARED: LLUVIA DE DÍGITOS, Y EL OJO POR AUSENCIA.
 *
 * ⚠ NO ESTÁ DIBUJADO: ESTÁ RECORTADO. El campo se llena de unos y ceros y la
 * forma del ojo es donde los dígitos NO están.
 *
 * Antes era una silueta vectorial encima del ruido y se leía como un emoji
 * pegado sobre una textura. El problema no era el dibujo: era que el ojo y el
 * fondo estaban hechos de cosas distintas, así que uno se veía ENCIMA del otro
 * en vez de DENTRO. Con la ausencia hay una sola capa, con un agujero con forma.
 */

import { COLS, ROWS, eyeAt, rainFrame } from '@/lib/system/eyeStatic';

/** Un dado repetible, para que los fotogramas se puedan comparar. */
const dado = () => {
    let n = 7;
    return () => {
        n = (n * 1103515245 + 12345) % 2147483648;
        return n / 2147483648;
    };
};

const filas = (shape = { look: 0, lid: 0 }) =>
    rainFrame(shape, dado()).split('\n');

/** Cuántos huecos tiene una fila. Es lo que dibuja el ojo. */
const huecos = (fila: string) => [...fila].filter((c) => c === ' ').length;

describe('el campo', () => {
    it('tiene la forma que dice tener', () => {
        const f = filas();

        expect(f).toHaveLength(ROWS);
        expect(f.every((l) => l.length === COLS)).toBe(true);
    });

    it('está lleno de unos y ceros, y de nada más', () => {
        // Sólo dígitos y huecos: cualquier otro carácter delataría un dibujo.
        expect(rainFrame({ look: 0, lid: 0 }, dado())).toMatch(/^[01 \n]+$/);
    });

    it('y llueve: cada fotograma es distinto', () => {
        const uno = rainFrame({ look: 0, lid: 0 }, () => 0.1);
        const otro = rainFrame({ look: 0, lid: 0 }, () => 0.9);

        expect(uno).not.toBe(otro);
    });
});

describe('⚠ pero el ojo NO se mueve con la lluvia', () => {
    it('los huecos caen en el mismo sitio con cualquier dado', () => {
        /*
         * Es lo que hace que el ojo MIRE. Todo el campo hierve y la forma se
         * queda exactamente donde está — si se movieran también los huecos
         * sería ruido, y lo que inquieta es que el ruido cambie y el ojo no.
         *
         * ⚠ LOS DOS DADOS TIENEN QUE LLENAR EL CAMPO. Cada columna saca su
         * propia densidad del mismo dado, así que uno alto —`0.99`— deja el
         * campo entero en blanco y la comparación no prueba nada. Con `0.1` y
         * `0.4` todas las columnas quedan tupidas, y entonces el único hueco
         * que puede quedar es el del ojo.
         */
        const conUno = rainFrame({ look: 0, lid: 0 }, () => 0.1).split('\n');
        const conOtro = rainFrame({ look: 0, lid: 0 }, () => 0.4).split('\n');

        for (let r = 0; r < ROWS; r += 1) {
            for (let c = 0; c < COLS; c += 1) {
                expect(conUno[r][c] === ' ').toBe(conOtro[r][c] === ' ');
            }
        }
    });
});

describe('la forma es un ojo, no una mancha', () => {
    /*
     * ⚠ ESTOS TESTS NO LLEVAN NINGUNA FILA ESCRITA A MANO, y es a propósito.
     *
     * La primera versión comparaba «la fila 13» contra «las filas 16 a 22», y
     * en cuanto la geometría se ajustó —el ojo pasó a ser un primer plano— esos
     * números dejaron de señalar lo que decían señalar. Lo que hay que
     * comprobar no es dónde cae el ojo: es que TENGA FORMA DE OJO.
     */

    /** Cuántos huecos por fila. Es el perfil del dibujo. */
    const perfil = () => filas().map(huecos);

    it('es una lente: se ensancha hacia el centro y se cierra en las puntas', () => {
        // Una caja tendría el mismo hueco en todas las filas.
        const p = perfil();
        const ancha = p.indexOf(Math.max(...p));

        expect(p[ancha - 3]).toBeLessThan(p[ancha]);
        expect(p[ancha + 3]).toBeLessThan(p[ancha]);
    });

    it('y tiene pliegue: dos vacíos separados por una franja con dígitos', () => {
        /*
         * Sin él, una almendra con un círculo es un icono. El pliegue —la
         * sombra del párpado barriendo por encima— es lo que la vuelve una cara
         * mirándote.
         *
         * Se comprueba contando los TRAMOS de filas con hueco: tiene que haber
         * más de uno, o sea un vacío arriba, dígitos en medio, y el ojo debajo.
         */
        const p = perfil();
        const umbral = Math.max(...p) * 0.25;

        let tramos = 0;
        let dentro = false;

        for (const n of p) {
            if (n > umbral && !dentro) tramos += 1;
            dentro = n > umbral;
        }

        expect(tramos).toBeGreaterThanOrEqual(2);
    });
});

describe('mira, y se cierra', () => {
    it('mirar mueve el iris pero no el párpado', () => {
        /*
         * Un ojo que se desplaza entero no mira: se traslada. Así que el total
         * de huecos apenas cambia —la almendra es la misma— pero el dibujo sí.
         */
        const centro = rainFrame({ look: 0, lid: 0 }, () => 0.5);
        const lado = rainFrame({ look: -1, lid: 0 }, () => 0.5);

        expect(centro).not.toBe(lado);

        const h = (s: string) => [...s].filter((c) => c === ' ').length;
        expect(Math.abs(h(centro) - h(lado))).toBeLessThan(h(centro) * 0.2);
    });

    it('y cerrarlo lo hace desaparecer', () => {
        const abierto = rainFrame({ look: 0, lid: 0 }, () => 0.5);
        const cerrado = rainFrame({ look: 0, lid: 1 }, () => 0.5);

        const h = (s: string) => [...s].filter((c) => c === ' ').length;

        // Queda la ceja, que no se cierra. El párpado sí.
        expect(h(cerrado)).toBeLessThan(h(abierto) / 2);
    });
});

describe('el ritmo', () => {
    it('el cierre final baja y NO vuelve a abrirse', () => {
        // Que el último gesto sea suyo y no del reloj es lo que convierte el
        // momento en una despedida.
        const a = eyeAt(0, true).lid;
        const b = eyeAt(5, true).lid;
        const c = eyeAt(40, true).lid;

        expect(b).toBeGreaterThan(a);
        expect(c).toBe(1);
    });

    it('y mientras mira, el parpadeo y la mirada no van al mismo paso', () => {
        /*
         * En cuanto los dos ritmos caen juntos, el ojo deja de mirar y pasa a
         * repetirse. Se comprueba que la secuencia no se repite en un ciclo
         * corto.
         */
        const traza = (n: number) =>
            Array.from({ length: n }, (_, i) => {
                const e = eyeAt(i, false);
                return `${e.look}:${e.lid}`;
            }).join('|');

        expect(traza(58)).not.toBe(traza(116).slice(traza(58).length + 1));
    });
});
