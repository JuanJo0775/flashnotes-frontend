// tests/lib/system/audio/jitter.test.ts

/**
 * NUNCA IDÉNTICO.
 *
 * La repetición exacta es LA señal de que el audio es falso, y el oído la caza
 * al tercer clic. Un objeto real nunca suena dos veces igual: la tecla no cae
 * siempre con la misma fuerza ni el plástico resuena siempre igual.
 *
 * Por eso esto no es un adorno que se añade al final, es obligatorio en cada
 * voz — y por eso vive en un módulo propio, puro, con el azar inyectable:
 * comprobar un rango con `Math.random` de por medio da un test que puede fallar
 * sin que nada esté roto, que es exactamente lo que prohíbe la regla D1.
 */

import { vary, varyInt } from '@/lib/system/audio/jitter';

/** Un azar de mentira que devuelve lo que se le diga, en orden. */
function azarFijo(...valores: number[]): () => number {
    let i = 0;
    return () => valores[i++ % valores.length];
}

describe('la variación de una magnitud', () => {
    it('en el centro del azar no cambia nada', () => {
        // 0.5 es el punto medio, así que no hay desviación. Sin esto, un signo
        // mal puesto desafinaría TODO de forma constante y sonaría igual de
        // repetido, sólo que en otra nota.
        expect(vary(440, 0.02, azarFijo(0.5))).toBeCloseTo(440, 9);
    });

    it('en un extremo del azar sube justo el porcentaje pedido', () => {
        expect(vary(440, 0.02, azarFijo(1))).toBeCloseTo(440 * 1.02, 9);
    });

    it('y en el otro baja lo mismo', () => {
        expect(vary(440, 0.02, azarFijo(0))).toBeCloseTo(440 * 0.98, 9);
    });

    it('nunca se sale del rango, con cualquier azar', () => {
        // La razón de que exista el tope: una tecla que se desafina un 30% deja
        // de ser la misma tecla. El jitter tiene que ser imperceptible por
        // separado y evidente en conjunto.
        for (let i = 0; i <= 20; i += 1) {
            const v = vary(1_000, 0.02, azarFijo(i / 20));

            expect(v).toBeGreaterThanOrEqual(980);
            expect(v).toBeLessThanOrEqual(1_020);
        }
    });

    it('funciona igual con magnitudes pequeñas, como los tiempos', () => {
        // Los tiempos de envolvente son milisegundos de un dígito y también se
        // varían. Con una implementación que sumara un absoluto en vez de un
        // porcentaje, acá saldría un número negativo.
        expect(vary(3, 0.02, azarFijo(0))).toBeGreaterThan(0);
        expect(vary(3, 0.02, azarFijo(0))).toBeCloseTo(2.94, 9);
    });

    it('un porcentaje de cero devuelve el valor tal cual', () => {
        expect(vary(440, 0, azarFijo(0))).toBe(440);
        expect(vary(440, 0, azarFijo(1))).toBe(440);
    });
});

describe('la variación de una cuenta', () => {
    it('devuelve enteros, porque hay cosas que no admiten medio paso', () => {
        // El glitch se corta en ESCALONES para calzar con `steps(1, end)`. Un
        // escalón y medio no existe: o hay corte o no lo hay.
        const v = varyInt(8, 0.25, azarFijo(0.9));

        expect(Number.isInteger(v)).toBe(true);
    });

    it('y nunca baja de uno, aunque el azar tire para abajo', () => {
        /*
         * ⚠ CERO ESCALONES ES UN SONIDO QUE NO SUENA.
         *
         * Redondear hacia abajo un valor pequeño da 0, y una ráfaga de cero
         * escalones es silencio: el glitch temblaría en la imagen y no sonaría,
         * que es justo el fallo que este sistema no se puede permitir.
         */
        expect(varyInt(1, 0.9, azarFijo(0))).toBeGreaterThanOrEqual(1);
        expect(varyInt(2, 0.9, azarFijo(0))).toBeGreaterThanOrEqual(1);
    });
});
