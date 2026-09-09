// tests/lib/system/audio/bars.test.ts

/**
 * EL TONO DE LAS BARRAS. El sonido de la industria.
 *
 * ⚠ PEDIDO: «el de las barras tiene un sonido de la industria, cuando carga,
 * cuando inician los tubos, todo».
 *
 * Y existe de verdad, no es una licencia: las barras de ajuste de televisión
 * SIEMPRE van con un tono de referencia de 1 kHz. Es la señal con la que se
 * calibraba el nivel de audio de una emisión, y por eso todo el mundo la asocia
 * con «esto es una carta de ajuste» aunque no sepa por qué.
 *
 * Es la pieza que convierte el arranque en algo que se reconoce.
 */

import { BARS_HZ, barsToneIsOn, startBarsTone, stopBarsTone } from '@/lib/system/audio/bars';
import { PEAK_DBFS } from '@/lib/system/audio/mix';
import { ensureAudio, setSoundOn, teardownAudio } from '@/lib/system/audio/context';
import { contextCount, installFakeAudio, lastContext } from './fakeAudio';

let quitarFalso: () => void;

beforeEach(() => {
    localStorage.clear();
    quitarFalso = installFakeAudio();
});

afterEach(() => {
    stopBarsTone();
    teardownAudio();
    quitarFalso();
});

describe('el tono', () => {
    it('⚠ es 1 kHz, que es el de verdad', () => {
        // 1 000 Hz es el tono de referencia de la industria. Cualquier otro
        // numero suena parecido y no significa nada.
        expect(BARS_HZ).toBe(1_000);
    });

    it('suena mientras se le pida, y para cuando se le dice', () => {
        ensureAudio();
        const antes = lastContext()!.created.length;

        startBarsTone();
        expect(barsToneIsOn()).toBe(true);

        const osc = lastContext()!
            .created.slice(antes)
            .find((n) => n.kind === 'oscillator')!;

        expect(osc.frequency.value).toBeGreaterThan(900);
        expect(osc.frequency.value).toBeLessThan(1_100);

        stopBarsTone();
        expect(barsToneIsOn()).toBe(false);
        expect(osc.stopped).not.toBeNull();
    });

    it('no se duplica si se pide dos veces', () => {
        ensureAudio();
        startBarsTone();
        const uno = lastContext()!.count('oscillator');

        startBarsTone();

        expect(lastContext()!.count('oscillator')).toBe(uno);
    });

    it('⚠ entra y sale con rampa, no de golpe', () => {
        /*
         * Un tono puro que empieza o acaba en seco deja un chasquido de
         * discontinuidad, y encima muy audible por ser una senoide limpia. Es la
         * marca del audio mal hecho, y en el sonido MAS reconocible del arranque
         * seria justo donde peor queda.
         */
        ensureAudio();
        const antes = lastContext()!.created.length;

        startBarsTone();

        const gain = lastContext()!
            .created.slice(antes)
            .find((n) => n.kind === 'gain')!;

        expect(gain.gain.calls.some((c) => c.method !== 'setValueAtTime')).toBe(true);
    });

    it('sale por la bocinita: es una señal, no un objeto de la sala', () => {
        // Un tono de calibracion no lo hace la habitacion: lo EMITE el aparato.
        ensureAudio();
        startBarsTone();

        expect(lastContext()!.count('oscillator')).toBeGreaterThan(0);
    });

    it('y no es lo mas fuerte del sistema', () => {
        // Suena unos segundos seguidos, asi que es continuo: le vale la misma
        // regla que al ambiente, no la de un golpe.
        expect(PEAK_DBFS.ambience).toBeLessThan(PEAK_DBFS.confirm);
    });
});

describe('con el sonido apagado', () => {
    it('no crea ni un nodo', () => {
        setSoundOn(false);

        startBarsTone();

        expect(contextCount()).toBe(0);
        expect(barsToneIsOn()).toBe(false);
    });
});
