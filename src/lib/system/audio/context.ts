// src/lib/system/audio/context.ts

/**
 * El único `AudioContext` del proyecto, y los dos caminos por los que sale todo.
 *
 * ⚠ NACE EN EL PRIMER GESTO Y NO ANTES, y no es una decisión de diseño sino una
 * ley del navegador: Chrome, Safari y Firefox crean todo contexto en estado
 * `suspended` hasta que alguien toca algo. En la primera carga de la página no
 * hay forma de sonar. Punto.
 *
 * Eso no es un obstáculo, es un regalo: la máquina está MUDA hasta que la
 * tocás, y el primer clic enciende el parlante. Encaja con la ficción sin
 * forzar nada, así que se abraza en vez de pelearlo.
 *
 * ⚠ Y APAGADO NO CREA NI UN NODO. No es volumen cero: es que el contexto no
 * llega a existir. Un contexto abierto mantiene despierto el subsistema de
 * audio del sistema operativo, y en un portátil eso se paga en batería aunque
 * no suene nada.
 */

import { impulseResponse } from '@/lib/system/audio/room';
import { resetGate } from '@/lib/system/audio/mix';
import {
    BAND_HIGH_HZ,
    BAND_LOW_HZ,
    SATURATION,
    saturationCurve,
} from '@/lib/system/audio/speaker';

/**
 * Dónde se recuerda el interruptor.
 *
 * Hermano de `flashnotes:effects`, y el paralelo es a propósito: se apagan
 * igual, se recuerdan igual, y quien sepa apagar uno sabe apagar el otro.
 */
export const SOUND_STORAGE_KEY = 'flashnotes:sound';

/**
 * Hasta dónde llega el aire de la habitación.
 *
 * No es el cono de la máquina: es el techo de una grabación de la época y de un
 * cuarto con cosas blandas dentro. Deja pasar el cuerpo entero de un objeto
 * físico y sólo le quita el brillo que delataría que esto es de hoy.
 */
export const AIR_HIGH_HZ = 9_000;

/** Y la habitación satura mucho menos que un altavoz forzado. */
export const AIR_SATURATION = 0.6;

/**
 * Los dos sitios donde se enchufa una voz. Cuál se elige NO es un ajuste de
 * tono: es de qué clase de cosa se trata.
 */
export interface AudioGraph {
    ctx: AudioContext;
    /**
     * LO QUE LA MÁQUINA EMITE por su bocinita interna.
     *
     * Cono de cinco centímetros: de 200 Hz a 6 kHz y saturando. Acá lo pobre es
     * la intención — es lo que delata a una PC de los ochenta.
     */
    speaker: GainNode;
    /**
     * LO QUE LA MÁQUINA Y LA SALA HACEN FÍSICAMENTE.
     *
     * La tecla, el relé, el cabezal, el chasis. No salen por ningún altavoz:
     * son objetos en una habitación y los oye tu oreja directamente.
     *
     * ⚠ NO PASAN POR EL PASABANDA DE LA BOCINITA, y ésta es la decisión que
     * sostiene la calidad de todo el sistema. Recortar a 200 Hz le arranca a
     * una tecla el cuerpo de 100 a 400 Hz, que es TODO lo que separa un teclado
     * mecánico de uno de membrana. Se pierde en una línea y no se recupera
     * subiendo el volumen.
     */
    air: GainNode;
    /**
     * El envío a la sala, común a los dos.
     *
     * ⚠ Es un ENVÍO y no está en serie. Un sonido real es directo MÁS cuarto;
     * con el convolver en el camino la tecla perdería el golpe y sonaría como
     * si la tocaran en la habitación de al lado.
     *
     * Y hay UNA sola sala. Con un cuarto por camino, el bip y la tecla sonarían
     * en dos habitaciones distintas y el oído lo nota: se rompe la ilusión de
     * que hay una única máquina.
     */
    room: GainNode;
    master: GainNode;
}

let grafo: AudioGraph | null = null;

/** ¿Está encendido? Encendido por defecto, igual que los efectos. */
export function isSoundOn(): boolean {
    // Quien pide menos movimiento no está pidiendo más ruido. Manda sobre la
    // preferencia guardada, igual que A3 manda sobre las animaciones.
    try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch {
        // Sin matchMedia se sigue adelante: no saber no es motivo para callar.
    }

    try {
        return localStorage.getItem(SOUND_STORAGE_KEY) !== 'off';
    } catch {
        return true;
    }
}

/** Enciende o apaga, y lo recuerda. Apagar cierra lo que hubiera abierto. */
export function setSoundOn(on: boolean) {
    try {
        localStorage.setItem(SOUND_STORAGE_KEY, on ? 'on' : 'off');
    } catch {
        // Sin persistencia el interruptor dura lo que la pestaña. Aceptable.
    }

    if (!on) teardownAudio();
}

/**
 * El contexto y sus caminos, creándolos si hace falta.
 *
 * Devuelve `null` si el sonido está apagado o si el navegador no trae Web
 * Audio. Quien llama no tiene que preguntar antes: pide, y si viene `null` no
 * suena nada. Ésa es toda la comprobación que necesita una voz.
 */
export function ensureAudio(): AudioGraph | null {
    if (!isSoundOn()) return null;
    if (grafo) return grafo;

    const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();

    /*
     * EL TECHO COMÚN.
     *
     * Un solo limitador y un solo maestro para los dos caminos. Con un
     * limitador por camino, dos sonidos a la vez se pasan del techo real y el
     * navegador recorta con el ruido feo de siempre.
     */
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    const limitador = ctx.createDynamicsCompressor();
    limitador.threshold.value = -6;
    limitador.ratio.value = 12;
    limitador.connect(master);

    /*
     * CAMINO 1 · LA BOCINITA.
     *
     * bus → recorte de graves → recorte de agudos → saturación → limitador.
     *
     * La banda va ANTES de la saturación: saturar primero generaría armónicos
     * agudos que el cono no puede dar y que habría que recortar después, o sea
     * suciedad que no aporta. Filtrar y luego doblar es el orden físico.
     */
    const shaperCono = ctx.createWaveShaper();
    shaperCono.curve = saturationCurve(SATURATION);
    shaperCono.oversample = '2x';
    shaperCono.connect(limitador);

    const conoAgudos = ctx.createBiquadFilter();
    conoAgudos.type = 'lowpass';
    conoAgudos.frequency.value = BAND_HIGH_HZ;
    conoAgudos.connect(shaperCono);

    const conoGraves = ctx.createBiquadFilter();
    conoGraves.type = 'highpass';
    conoGraves.frequency.value = BAND_LOW_HZ;
    conoGraves.connect(conoAgudos);

    const speaker = ctx.createGain();
    speaker.connect(conoGraves);

    /*
     * CAMINO 2 · EL AIRE DE LA HABITACIÓN.
     *
     * Sin recorte de graves —ahí vive el cuerpo de los objetos— y con un techo
     * mucho más alto. La saturación es leve: lo justo para que no suene a
     * biblioteca de efectos de hoy.
     */
    const shaperAire = ctx.createWaveShaper();
    shaperAire.curve = saturationCurve(AIR_SATURATION);
    shaperAire.connect(limitador);

    const aireAgudos = ctx.createBiquadFilter();
    aireAgudos.type = 'lowpass';
    aireAgudos.frequency.value = AIR_HIGH_HZ;
    aireAgudos.connect(shaperAire);

    const air = ctx.createGain();
    air.connect(aireAgudos);

    /*
     * LA SALA, COMPARTIDA, Y SU SALIDA VUELVE POR EL AIRE.
     *
     * El cuarto no se oye a través del altavoz de la máquina: se oye con la
     * oreja. Devolver la reverberación por el camino de aire es lo que hace que
     * el bip de la bocinita suene como algo pequeño sonando DENTRO de una
     * habitación de verdad.
     */
    const convolver = ctx.createConvolver();
    const [izq, der] = impulseResponse(ctx.sampleRate);
    const ir = ctx.createBuffer(2, izq.length, ctx.sampleRate);
    ir.copyToChannel(izq, 0);
    ir.copyToChannel(der, 1);
    convolver.buffer = ir;
    convolver.connect(air);

    const room = ctx.createGain();
    room.gain.value = 0.5;
    room.connect(convolver);

    // Nace suspendido por ley del navegador; esto es lo único que se puede
    // hacer, y funciona porque siempre se llega acá desde un gesto.
    void ctx.resume?.();

    grafo = { ctx, speaker, air, room, master };
    return grafo;
}

/** Cierra el contexto y suelta el grafo. Deja el sistema en cero nodos. */
export function teardownAudio() {
    if (!grafo) return;

    void grafo.ctx.close?.();
    grafo = null;
    resetGate();
}
