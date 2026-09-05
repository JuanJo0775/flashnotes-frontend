// tests/lib/system/eyeStatic.test.ts

/**
 * EL OJO DETRÁS DE LA PARED, MOVIÉNDOSE.
 *
 * ⚠ LA PIEZA DE LA COLECCIÓN ESTÁ QUIETA A PROPÓSITO —una que cambiara no se
 * podría coleccionar— pero lo que se ve detrás de la pared no es la pieza en una
 * vitrina: es la cosa, mirándote. Ahí quieto se lee como una ilustración.
 */

import {
    BLINK_EVERY,
    isBlink,
    staticFrame,
} from '@/lib/system/eyeStatic';

/** Un campo pequeño con un hueco en medio, con la misma forma que el ojo. */
const CAMPO = ['1011101110', '110   00010', '10  01  011', '1100111001'].join(
    '\n'
);

/** Un dado que alterna, para que los fotogramas sean comprobables. */
const dado = () => {
    let n = 0;
    return () => (n++ % 2 === 0 ? 0.1 : 0.9);
};

describe('la lluvia se agita', () => {
    it('los dígitos cambian de un fotograma a otro', () => {
        const uno = staticFrame(CAMPO, false, () => 0.1);
        const otro = staticFrame(CAMPO, false, () => 0.9);

        expect(uno).not.toBe(otro);
    });

    it('⚠ pero los huecos NO se mueven', () => {
        /*
         * Es lo que hace que el ojo mire. Todo el campo hierve y la forma se
         * queda exactamente donde está — si se movieran también los huecos
         * sería ruido, y lo que inquieta es que el ruido cambie y el ojo no.
         */
        const frame = staticFrame(CAMPO, false, dado());

        const huecosOriginales = [...CAMPO].map((c) => c === ' ');
        const huecosAhora = [...frame].map((c) => c === ' ');

        expect(huecosAhora).toEqual(huecosOriginales);
    });

    it('y el dibujo conserva su forma exacta', () => {
        // Mismas filas, mismo ancho. Si cambiara, el ojo se deformaría.
        const frame = staticFrame(CAMPO, false, dado());

        expect(frame.split('\n').map((l) => l.length)).toEqual(
            CAMPO.split('\n').map((l) => l.length)
        );
    });
});

describe('parpadea', () => {
    it('al cerrar, los huecos se llenan y el ojo desaparece', () => {
        // Un parpadeo es la señal más barata y más antigua de que algo está
        // vivo. Acá además es literal: se cierra.
        const cerrado = staticFrame(CAMPO, true, dado());

        expect(cerrado).not.toContain(' ');
        expect(cerrado.split('\n')).toHaveLength(CAMPO.split('\n').length);
    });

    it('y lo hace poco', () => {
        /*
         * ⚠ Uno cada dos segundos es un tic nervioso. Uno cada tanto es algo
         * que está ahí quieto, mirando, y que de vez en cuando cierra los ojos.
         * Lo segundo da mucho más miedo.
         */
        expect(BLINK_EVERY).toBeGreaterThanOrEqual(20);

        const parpadeos = Array.from({ length: BLINK_EVERY }, (_, i) =>
            isBlink(i)
        ).filter(Boolean);

        // Dos fotogramas seguidos: cerrar y abrir.
        expect(parpadeos).toHaveLength(2);
    });
});

describe('⚠ la banda de censura sobrevive', () => {
    it('los `#` del ojo tapado no se los come la lluvia', () => {
        /*
         * El ojo del final en que lo reportás lleva una banda de `#`. Si la
         * lluvia se los llevara, la censura se disolvería sola en dos
         * fotogramas — y ese final se quedaría sin su única marca.
         */
        const tapado = '1011\n1####1\n0110';

        const frame = staticFrame(tapado, false, dado());

        expect(frame.split('\n')[1]).toContain('####');
    });

    it('ni siquiera al parpadear', () => {
        const tapado = '1011\n1####1\n0110';

        expect(staticFrame(tapado, true, dado()).split('\n')[1]).toContain(
            '####'
        );
    });
});
