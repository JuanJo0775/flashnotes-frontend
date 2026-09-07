// tests/lib/system/audio/ambience.test.ts

/**
 * EL AMBIENTE, QUE EXISTE SOBRE TODO PARA PODER DESAPARECER.
 *
 * ⚠ NO ES UN LECHO. Un zumbido de red más un ventilador más siseo, sonando sin
 * parar, cansa en cinco minutos y arruina todo lo demás por enmascaramiento. Es
 * UN elemento, muy tenue, y no suena siempre.
 *
 * ⚠ Y LA RAZÓN DE QUE SE QUEDE ES EL SILENCIO DEL DERRUMBE. Quitar de golpe algo
 * que llevaba veinte minutos ahí es lo más fuerte que puede hacer este sistema,
 * y es gratis. Sin lecho, ese momento no cuesta nada y no vale nada — así que el
 * ambiente puede estar tan bajo como haga falta, pero tiene que existir.
 */

import {
    AMBIENCE_MIX,
    ambienceGain,
    silence,
    startAmbience,
    stopAmbience,
} from '@/lib/system/audio/ambience';
import { PEAK_DBFS, dbToGain } from '@/lib/system/audio/mix';
import { ensureAudio, setSoundOn, teardownAudio } from '@/lib/system/audio/context';
import { contextCount, installFakeAudio, lastContext, reaches } from './fakeAudio';

let quitarFalso: () => void;

beforeEach(() => {
    localStorage.clear();
    quitarFalso = installFakeAudio();
});

afterEach(() => {
    stopAmbience();
    teardownAudio();
    quitarFalso();
});

describe('cómo está hecho', () => {
    it('⚠ RESPIRA: no es un tono, son varios y llevan derivas', () => {
        /*
         * Un bucle fijo se delata en treinta segundos. Lo que hace que un
         * zumbido se lea como una máquina encendida y no como un fichero
         * repitiéndose son los LFOs lentos moviéndolo por debajo.
         */
        startAmbience();

        const osciladores = lastContext()!.count('oscillator');

        // Los armónicos del zumbido MÁS las derivas que los mueven.
        expect(osciladores).toBeGreaterThanOrEqual(4);
    });

    it('⚠ NO es un tono: lleva aire, no sólo osciladores', () => {
        /*
         * REPORTADO JUGANDO: «cuando sale da un pitido feo».
         *
         * Tres senos puros a 58, 116 y 174 Hz son EXACTAMENTE un tono de prueba
         * de laboratorio. Lo que convierte un zumbido en un chasis es el aire:
         * el ruido ancho y grave de una caja de plástico con una fuente dentro.
         * Sin él, cuanto más subís el volumen más se nota que es un oscilador —
         * y el reporte llegó justo después de subir el volumen del equipo.
         */
        startAmbience();

        expect(lastContext()!.count('bufferSource')).toBeGreaterThan(0);
    });

    it('sale por el aire y llega a la salida', () => {
        // El chasis es un objeto de la habitación, no algo que emita la
        // bocinita: va por el mismo camino que la tecla y el relé.
        const g = ensureAudio()!;
        startAmbience();

        expect(reaches(g.air, 'destination')).toBe(true);
    });

    it('⚠ sus fuentes están NORMALIZADAS antes del presupuesto', () => {
        /*
         * EL SEGUNDO MOTIVO DE QUE EL FONDO SE COMIERA A LAS ACTIVIDADES.
         *
         * El zumbido son cuatro fuentes —tres armónicos y el aire— sumándose
         * ANTES de aplicar su nivel. Sumaban 2,13, así que el ambiente salía a
         * más del doble de lo que la tabla decía: −37 dBFS reales cuando el
         * presupuesto ponía −44.
         *
         * Es el fallo clásico de mezclar: cada voz suena bien sola, y lo que
         * llega a la salida es la suma. Normalizadas, el número de la tabla
         * vuelve a significar lo que dice.
         */
        expect(AMBIENCE_MIX).toBeLessThanOrEqual(1);
        expect(AMBIENCE_MIX).toBeGreaterThan(0.9);
    });

    it('es lo más callado de todo, y por mucho', () => {
        // −34 dBFS. Diez decibelios por debajo de las teclas es la diferencia
        // entre «hay algo» y «se oye»; más cerca, empieza a enmascarar.
        expect(PEAK_DBFS.ambience).toBeLessThan(PEAK_DBFS.keys);
        expect(ambienceGain()).toBeCloseTo(dbToGain(PEAK_DBFS.ambience), 9);
    });
});

describe('entra y sale despacio', () => {
    it('no aparece de golpe: sube en segundos, no en milisegundos', () => {
        /*
         * Un ambiente que entra de golpe se oye ENTRAR, y entonces deja de ser
         * ambiente para ser un suceso. Lo que tiene que pasar es que en algún
         * momento te des cuenta de que ya estaba.
         */
        startAmbience();

        const rampas = lastContext()!
            .created.filter((n) => n.kind === 'gain')
            .flatMap((n) => n.gain.calls)
            .filter((c) => c.method !== 'setValueAtTime');

        const masLarga = Math.max(...rampas.map((c) => c.time));

        expect(masLarga).toBeGreaterThanOrEqual(3);
    });

    it('parar lo apaga y suelta sus nodos', () => {
        startAmbience();
        const vivos = lastContext()!.created.filter((n) => n.kind === 'oscillator');

        stopAmbience();

        for (const o of vivos) expect(o.stopped).not.toBeNull();
    });

    it('arrancarlo dos veces no lo duplica', () => {
        // Dos ambientes a la vez suenan al doble y desafinan entre ellos, y es
        // el fallo fácil: cualquier cosa que «avise de actividad» lo llamaría.
        startAmbience();
        const despuesDeUno = lastContext()!.count('oscillator');

        startAmbience();

        expect(lastContext()!.count('oscillator')).toBe(despuesDeUno);
    });
});

describe('⚠ y sobre todo: se puede callar del todo', () => {
    it('el silencio es CERO, no un número pequeño', () => {
        /*
         * El derrumbe pide silencio ABSOLUTO durante 200 ms. Un ambiente a
         * −60 dB sigue estando ahí: el oído lo nota, y lo que tiene que notar es
         * que no hay NADA. La diferencia entre casi nada y nada es justamente el
         * efecto.
         */
        startAmbience();

        silence(200);

        const valores = lastContext()!
            .created.filter((n) => n.kind === 'gain')
            .flatMap((n) => n.gain.calls.map((c) => c.value));

        expect(valores).toContain(0);
    });

    it('y vuelve solo después', () => {
        // Si no volviera, el derrumbe dejaría la máquina muerta para siempre y
        // el silencio dejaría de ser un gesto para ser una avería.
        startAmbience();

        silence(200);

        const gananciaDelAmbiente = lastContext()!
            .created.filter((n) => n.kind === 'gain')
            .find((n) => n.gain.calls.some((c) => c.value === 0))!;

        const despues = gananciaDelAmbiente.gain.calls.filter((c) => c.value > 0);

        expect(despues.length).toBeGreaterThan(0);
    });
});

describe('con el sonido apagado', () => {
    it('no crea ni un nodo', () => {
        setSoundOn(false);

        startAmbience();

        expect(contextCount()).toBe(0);
    });
});
