// tests/lib/system/audio/finales.test.ts

/**
 * LOS DOS FINALES SUENAN, Y SUENAN OPUESTOS.
 *
 * ⚠ ERAN LOS DOS MOMENTOS MÁS GRANDES DEL JUEGO Y SONABAN COMO `//ls`. Es el
 * final de un arco de cuatro etapas y la única decisión irreversible que tomás
 * sobre alguien; lo único que se oía era el teletipo escribiendo la respuesta.
 *
 * ⚠ Y NO BASTABA CON DARLES VOZ. Lo que hay que oír es en qué se diferencian, y
 * se diferencian en lo que el cuarto hace después: soltarlo pide sitio —la sala
 * se agacha, que es el gesto de «acá habla él»— y entregarlo no lo pide, porque
 * no hay nadie hablando: hay un formulario.
 */

import { startSound } from '@/lib/system/audio/wire';
import { teardownAudio } from '@/lib/system/audio/context';
import { startAmbience, stopAmbience, ambienceGain } from '@/lib/system/audio/ambience';
import { installFakeAudio, lastContext, type FakeNode } from './fakeAudio';

let quitarFalso: () => void;
let parar: () => void;

beforeEach(() => {
    localStorage.clear();
    quitarFalso = installFakeAudio();
    parar = startSound();
});

afterEach(() => {
    parar();
    stopAmbience();
    teardownAudio();
    quitarFalso();
    document.body.replaceChildren();
});

const unTic = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const nuevos = (desde: number): FakeNode[] => (lastContext()?.created ?? []).slice(desde);

/** Pinta la marca de un final, como hace el editor al contestar. */
function contestar(clase: string) {
    const el = document.createElement('div');
    el.className = `editor-reply-body ${clase}`;
    document.body.append(el);
    return () => el.remove();
}

/**
 * Lo que se le programó a un parámetro DESDE un punto.
 *
 * ⚠ HAY QUE MIRAR SÓLO LO NUEVO, y esto invalidó dos tests antes de escribirse:
 * `startAmbience` empieza en 0,0001 y sube al nivel, así que «¿alguna vez bajó
 * del nivel?» es SIEMPRE que sí — por la subida, no por el agachón. Un detector
 * que da verde pase lo que pase no está midiendo nada.
 */
const desde = (nodo: FakeNode, i: number) => nodo.gain.calls.slice(i);

/** Enciende la sala y devuelve su salida, que es donde vive el agachón. */
function salaEncendida(): FakeNode {
    stopAmbience();
    const antes = lastContext()?.created.length ?? 0;
    startAmbience(() => 0.5, 0);

    const salida = nuevos(antes).find((n) => n.kind === 'gain');
    if (!salida) throw new Error('la sala no se encendió');

    return salida;
}

describe('soltarlo', () => {
    it('⚠ suena a algo que se suelta dentro de la caja', async () => {
        /*
         * El condensador, y acá es literal: esa voz se construyó para el
         * arranque de la v0.2 —una máquina vieja soltando algo por dentro al
         * recibir corriente— y soltarlo a ÉL es la misma cosa dicha en serio.
         */
        salaEncendida();
        await unTic();
        const antes = lastContext()!.created.length;

        const quitar = contestar('entity-freed');
        await unTic();

        expect(nuevos(antes).length).toBeGreaterThan(0);
        quitar();
    });

    it('⚠ y la sala le hace sitio: es lo último que dice', async () => {
        const salida = salaEncendida();
        await unTic();

        const yaProgramado = salida.gain.calls.length;
        const quitar = contestar('entity-freed');
        await unTic(200);

        // El agachón programa una bajada por debajo del nivel del ambiente.
        const bajo = desde(salida, yaProgramado).some((c) => c.value < ambienceGain());
        expect(bajo).toBe(true);
        quitar();
    });
});

describe('entregarlo', () => {
    it('suena a formulario: dos pitidos planos e iguales', async () => {
        /*
         * Uno sería un aviso; dos seguidos y a la misma altura son un sello.
         *
         * ⚠ «A LA MISMA ALTURA» NO ES «IDÉNTICOS», y el test lo pidió idénticos
         * y falló por un hercio: en esta casa TODAS las voces llevan jitter, sin
         * excepción, porque un valor clavado es lo que delata que salió de un
         * ordenador de hoy. Dos pitidos con la deriva de la propia máquina
         * siguen siendo un sello; dos clavados serían un fichero repitiéndose.
         */
        salaEncendida();
        await unTic();
        const antes = lastContext()!.created.length;

        const quitar = contestar('entity-reported');
        await unTic(400);

        const tonos = nuevos(antes)
            .filter((n) => n.kind === 'oscillator')
            .map((n) => Math.round(n.frequency!.value));

        expect(tonos.length).toBeGreaterThanOrEqual(2);
        expect(Math.abs(tonos[0] - tonos[1])).toBeLessThan(12);
        quitar();
    });

    it('⚠ y el cuarto NO se agacha, que es todo el sentido', async () => {
        /*
         * Acabás de entregar a una persona y el zumbido sigue exactamente como
         * estaba. Esa indiferencia es el sonido: no hay nadie a quien hacerle
         * sitio, porque lo que hubo fue un trámite.
         */
        const salida = salaEncendida();
        await unTic();

        const yaProgramado = salida.gain.calls.length;
        const quitar = contestar('entity-reported');
        await unTic(400);

        const bajo = desde(salida, yaProgramado).some((c) => c.value < ambienceGain());
        expect(bajo).toBe(false);
        quitar();
    });
});
