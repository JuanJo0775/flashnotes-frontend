// tests/lib/system/v02Chrome.test.ts

/**
 * EL RELOJ Y LA FECHA DE LA v0.2, QUE VAN AL REVÉS.
 *
 * El reloj cuenta HACIA ATRÁS y la fecha sale dada la vuelta. Ninguna de las
 * dos cosas es un adorno: son los dos errores más creíbles que se cometen al
 * escribir esto por primera vez —restar donde había que sumar, y dar la vuelta a
 * la cadena entera en vez de al orden de los campos— y se reconocen al verlos.
 */

import { backwardsTime, reversedDate } from '@/lib/system/v02Chrome';

describe('el reloj hacia atrás', () => {
    it('parado, marca la hora de verdad', () => {
        const t = 1_700_000_000_000;
        expect(backwardsTime(t, t)).toBe(t);
    });

    it('cuanto más pasa, más atrás va', () => {
        const inicio = 1_700_000_000_000;

        const uno = backwardsTime(inicio + 1_000, inicio);
        const dos = backwardsTime(inicio + 2_000, inicio);

        expect(uno).toBeLessThan(inicio);
        expect(dos).toBeLessThan(uno);
    });

    it('retrocede al mismo ritmo que avanzaría', () => {
        // Ni a cámara lenta ni disparado: un segundo de verdad, un segundo
        // atrás. Un reloj que retrocede a otra velocidad se lee como un efecto;
        // a la misma velocidad se lee como un signo mal puesto.
        const inicio = 1_700_000_000_000;
        expect(backwardsTime(inicio + 5_000, inicio)).toBe(inicio - 5_000);
    });
});

describe('la fecha del revés', () => {
    it('da la vuelta a la cadena entera, no al orden de los campos', () => {
        // El error de verdad: alguien dio la vuelta a la cadena creyendo que
        // eso cambiaba el formato. Invertir los campos —02.09.2026— sería otro
        // formato correcto, y lo que se busca es uno roto.
        expect(reversedDate('2026.09.02')).toBe('20.90.6202');
    });

    it('deja la longitud igual: es la misma cadena, al revés', () => {
        expect(reversedDate('2026.09.02')).toHaveLength('2026.09.02'.length);
    });

    it('no revienta con la cadena vacía', () => {
        expect(reversedDate('')).toBe('');
    });
});
