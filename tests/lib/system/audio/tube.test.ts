// tests/lib/system/audio/tube.test.ts

/**
 * EL TUBO ENCENDIÉNDOSE Y APAGÁNDOSE.
 *
 * ⚠ REPORTADO JUGANDO: «el sonido de apagar suena poco natural», y «el inicio,
 * cuando aparecen las barras de colores y el logo, no tiene el sonido de
 * empezar, como cuando un computador se prende».
 *
 * Lo que había era un barrido de sierra bajando: el efecto de videojuego de toda
 * la vida. Un CRT no hace eso. Un CRT tiene un TRANSFORMADOR DE LÍNEAS —el
 * flyback— que chilla a unos 15,7 kHz mientras hay alta tensión, y ese chillido
 * es la firma del aparato: aparece al encender, se queda todo el rato de fondo y
 * CAE al apagar, mientras el tubo se descarga.
 *
 * Sin flyback, un apagado es una nota descendente. Con flyback, es un televisor.
 */

import { CATEGORY_OF, powerDown, powerUp, whine } from '@/lib/system/audio/voices';
import { ensureAudio, teardownAudio } from '@/lib/system/audio/context';
import { installFakeAudio, lastContext, type FakeNode } from './fakeAudio';

let quitarFalso: () => void;

beforeEach(() => {
    localStorage.clear();
    quitarFalso = installFakeAudio();
});

afterEach(() => {
    teardownAudio();
    quitarFalso();
});

function azar(semilla: number): () => number {
    let s = semilla;
    return () => {
        s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
        return s / 2_147_483_648;
    };
}

function nuevos(desde: number): FakeNode[] {
    return lastContext()!.created.slice(desde);
}

function fuentes(desde: number): FakeNode[] {
    return nuevos(desde).filter((n) => n.kind === 'bufferSource' || n.kind === 'oscillator');
}

describe('el chillido del flyback', () => {
    it('⚠ vive donde vive de verdad: cerca de los 15,7 kHz', () => {
        /*
         * No es un número decorativo: es la frecuencia de línea de la televisión
         * analógica, 15 625 Hz en PAL. Es EL sonido que delata a un tubo
         * encendido en una habitación, y el motivo de que mucha gente supiera
         * que un televisor estaba prendido sin verlo.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        whine(g, { fromHz: 15_700, toHz: 15_700, ms: 200 }, azar(1));

        const osc = fuentes(antes).find((n) => n.kind === 'oscillator')!;

        expect(osc.frequency.value).toBeGreaterThan(12_000);
        expect(osc.frequency.value).toBeLessThan(19_000);
    });

    it('y es fino: un tono, no un ruido', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        whine(g, { fromHz: 15_700, toHz: 15_700, ms: 200 }, azar(2));

        expect(fuentes(antes).filter((n) => n.kind === 'bufferSource')).toHaveLength(0);
    });
});

describe('apagar el tubo', () => {
    it('⚠ el chillido CAE, no se corta', () => {
        /*
         * Cortarlo en seco suena a mute. Lo que hace un tubo al que le quitan la
         * corriente es perder la alta tensión poco a poco: el chillido baja de
         * tono mientras se apaga, y eso es lo que se reconoce.
         */
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        powerDown(g, azar(3));

        const agudo = fuentes(antes)
            .filter((n) => n.kind === 'oscillator')
            .find((o) => o.frequency.calls.length > 1 && o.frequency.calls[0].value > 1_000)!;

        expect(agudo).toBeDefined();

        const rampas = agudo.frequency.calls;
        expect(rampas[rampas.length - 1].value).toBeLessThan(rampas[0].value);
    });

    it('y el tubo se descarga: hay ruido además del tono', () => {
        // El crujido del fósforo al colapsar. Sin él, apagar es una nota
        // bajando; con él, es algo que se quedó sin corriente.
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        powerDown(g, azar(4));

        expect(fuentes(antes).filter((n) => n.kind === 'bufferSource').length).toBeGreaterThan(0);
    });

    it('es corto: un apagón no dura un segundo y medio', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        powerDown(g, azar(5));

        const largo = Math.max(...fuentes(antes).map((f) => f.stopped! - f.started!));

        expect(largo).toBeLessThan(1);
    });
});

describe('encender el tubo', () => {
    it('⚠ el chillido SUBE y se queda, que es lo contrario de apagar', () => {
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        powerUp(g, azar(6));

        // ⚠ EL AGUDO, no el primero que tenga rampa: encender lleva DOS
        // osciladores con rampa —el golpe grave, que baja, y el chillido, que
        // sube— y agarrar el primero medía justo el contrario.
        const agudo = fuentes(antes)
            .filter((n) => n.kind === 'oscillator')
            .find((o) => o.frequency.calls.length > 1 && o.frequency.calls[0].value > 1_000)!;

        expect(agudo).toBeDefined();

        const rampas = agudo.frequency.calls;

        expect(rampas[rampas.length - 1].value).toBeGreaterThan(rampas[0].value);
    });

    it('y trae el golpe de la corriente entrando', () => {
        // Encender no es sólo que aparezca el chillido: primero entra la
        // corriente, y eso se oye como un golpe grave.
        const g = ensureAudio()!;
        const antes = lastContext()!.created.length;

        powerUp(g, azar(7));

        const graves = fuentes(antes)
            .filter((n) => n.kind === 'oscillator')
            .filter((o) => o.frequency.value < 200);

        expect(graves.length).toBeGreaterThan(0);
    });
});

describe('las tres declaran familia', () => {
    it('el encendido y el apagado son sucesos grandes', () => {
        expect(CATEGORY_OF.whine).toBe('ambience');
        expect(CATEGORY_OF.powerUp).toBe('glitch');
        expect(CATEGORY_OF.powerDown).toBe('glitch');
    });
});
